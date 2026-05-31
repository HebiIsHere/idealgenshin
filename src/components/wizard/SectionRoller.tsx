import React, { useEffect, useRef, useCallback, useState } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';
import { useMenuStore } from '../../stores/menuStore';

interface SectionRollerProps {
  renderSection: (section: WizardSection) => React.ReactNode;
}

function useSnapType(): string {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return isMobile ? 'none' : 'y mandatory';
}

function SectionRoller({ renderSection }: SectionRollerProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const scrollRef = useRef<HTMLDivElement>(null);
  const ignoringScroll = useRef(false);
  const [floatParams] = useState(() => ({ duration: 5.5 + Math.random() * 2, delay: Math.random() * 2 }));
  const snapType = useSnapType();
  const menuOpenCount = useMenuStore((s) => s.openCount);
  const isMenuOpen = menuOpenCount > 0;

  // Stable refs for wheel handler closure
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const sectionsLenRef = useRef(sections.length);
  sectionsLenRef.current = sections.length;

  // ── Wheel / touchpad → one card at a time, via store navigation ──
  // Mouse wheel: single event with large deltaY (±100) → immediate switch.
  // Touchpad: many events with tiny deltaY (±5~10) → accumulate to threshold → one switch per gesture.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    let wheelAccum = 0;
    let wheelClearTimer: ReturnType<typeof setTimeout>;

    const onWheel = (e: WheelEvent) => {
      e.preventDefault(); // always suppress native scroll
      if (ignoringScroll.current) return;

      wheelAccum += e.deltaY;
      clearTimeout(wheelClearTimer);

      // 300ms no new event → light touch / finger resting → reset
      wheelClearTimer = setTimeout(() => { wheelAccum = 0; }, 300);

      const THRESHOLD = 40;
      if (Math.abs(wheelAccum) < THRESHOLD) return;

      const dir = wheelAccum > 0 ? 1 : -1;
      wheelAccum = 0;
      const newIdx = currentIndexRef.current + dir;
      if (newIdx >= 0 && newIdx < sectionsLenRef.current) {
        goToSection(newIdx);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('wheel', onWheel);
      clearTimeout(wheelClearTimer);
    };
  }, [goToSection]);

  // ── Store → Scroll: scroll the target card into view ──
  // Desktop: scrollIntoView (browser natively coordinates with scroll-snap, no jitter).
  // Mobile:  offsetTop + scrollTo (hidden container has no native scroll, must be programmatic).
  useEffect(() => {
    const container = scrollRef.current;
    if (!container) return;

    const sectionKey = String(sections[currentIndex] ?? '');
    let targetEl: HTMLElement | null = null;
    for (let i = 0; i < container.children.length; i++) {
      const child = container.children[i] as HTMLElement;
      if (child.getAttribute('data-section') === sectionKey) {
        targetEl = child;
        break;
      }
    }
    if (!targetEl) return;

    // Already in view?
    const rect = targetEl.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    if (Math.abs(rect.top - containerRect.top) < 2) {
      ignoringScroll.current = false;
      return;
    }

    ignoringScroll.current = true;
    const finish = () => { ignoringScroll.current = false; };

    if (isMobile) {
      // Mobile: hidden container → programmatic scroll only
      container.scrollTo({ top: targetEl.offsetTop, behavior: 'smooth' });
      // No scrollend on hidden containers → timeout fallback
      setTimeout(finish, 600);
    } else {
      // Desktop: let browser coordinate smooth scroll + snap natively
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
      container.addEventListener('scrollend', finish, { once: true });
      const fallback = setTimeout(finish, 800);
      return () => {
        container.removeEventListener('scrollend', finish);
        clearTimeout(fallback);
      };
    }
  }, [currentIndex, sections, isMobile]);

  // ── Touch handling (mobile) ──
  const isTouchingRef = useRef(false);
  const momentumSettlingRef = useRef(false);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onTouchStart = () => { isTouchingRef.current = true; momentumSettlingRef.current = false; };
    const onTouchEnd = () => {
      isTouchingRef.current = false;
      momentumSettlingRef.current = true;
      setTimeout(() => { momentumSettlingRef.current = false; }, 400);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchend', onTouchEnd);
    };
  }, []);

  // ── Scroll → Store: detect manual scroll and sync currentIndex ──
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (ignoringScroll.current || isTouchingRef.current || momentumSettlingRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el || !el.children.length) return;
      const st = el.scrollTop;
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < el.children.length; i++) {
        const child = el.children[i] as HTMLElement;
        const childTop = child.offsetTop;
        const dist = Math.abs(st - childTop);
        if (dist < bestDist) { bestDist = dist; bestIdx = i; }
      }
      if (bestIdx !== currentIndex && bestIdx >= 0 && bestIdx < sections.length) {
        goToSection(bestIdx);
      }
    }, 100);
  }, [currentIndex, sections.length, goToSection]);

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        width: '100%',
        height: '100%',
        overflowY: isMobile ? 'hidden' : 'scroll',
        scrollSnapType: snapType,
        p: { xs: 4, md: 6 },
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {sections.map((section) => (
        <Box
          key={String(section)}
          data-section={String(section)}
          className="card-wrapper"
          sx={{
            height: { xs: '100dvh', md: '100vh' },
            scrollSnapAlign: isMobile ? undefined : 'start',
            scrollSnapStop: 'always',
            display: 'flex',
            alignItems: 'safe center',
            justifyContent: 'center',
            px: { xs: 1.5, md: 6 },
            py: { xs: 4, md: 6 },
          }}
        >
          <Box
            sx={{
              width: '100%',
              maxWidth: 600,
              maxHeight: { xs: 'calc(100dvh - 64px)', md: 'calc(100vh - 96px)' },
              overflowY: 'auto',
              py: 1,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <Box sx={{ overflow: 'visible', mx: { xs: 1, md: 5 }, my: 4 }}>
            <Paper
              elevation={0}
              className="card-animate"
              sx={{
                width: '100%',
                p: { xs: 2.5, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.08)',
                bgcolor: 'rgba(22,33,62,0.6)',
                backdropFilter: 'blur(12px)',
                overflow: 'visible',
                animation: `cardFloat ${floatParams.duration}s cubic-bezier(0.45,0,0.55,1) ${floatParams.delay}s infinite`,
                animationPlayState: isMenuOpen ? 'paused' : undefined,
                '&:hover': { animationPlayState: 'paused' },
              }}
            >
              <Box className="card-accent" sx={{ pt: 1 }}>
                {renderSection(section)}
              </Box>
            </Paper>
            </Box>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default SectionRoller;
