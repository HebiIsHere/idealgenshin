import React, { useEffect, useRef, useCallback } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';

interface SectionRollerProps {
  renderSection: (section: WizardSection) => React.ReactNode;
}

function useSnapType(): string {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  return isMobile ? 'none' : 'y proximity';
}

function SectionRoller({ renderSection }: SectionRollerProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const goToSection = useWizardStore((s) => s.goToSection);

  const scrollRef = useRef<HTMLDivElement>(null);
  const scrollingByStore = useRef(false);
  const floatRef = useRef({ duration: 5.5 + Math.random() * 2, delay: Math.random() * 2 });
  const snapType = useSnapType();

  // Stable refs for wheel handler closure
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;
  const sectionsLenRef = useRef(sections.length);
  sectionsLenRef.current = sections.length;

  // Desktop wheel → immediate card switch, one tick = one card
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const onWheel = (e: WheelEvent) => {
      if (scrollingByStore.current) return;

      e.preventDefault();
      const dir = e.deltaY > 0 ? 1 : -1;
      const newIdx = currentIndexRef.current + dir;
      if (newIdx >= 0 && newIdx < sectionsLenRef.current) {
        scrollingByStore.current = true;
        goToSection(newIdx);
      }
    };

    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, [goToSection]);

  // Store → scroll: navigate to card when currentIndex changes externally
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const vh = el.clientHeight;
    const targetTop = currentIndex * vh;
    if (Math.abs(el.scrollTop - targetTop) < 1) return;

    // Disable snap so intermediate snap points don't hijack the scroll
    el.style.scrollSnapType = 'none';
    scrollingByStore.current = true;
    el.scrollTo({ top: targetTop, behavior: 'smooth' });

    // rAF polling: wait until scrollTop stabilises (3 consecutive identical frames)
    // then verify we reached the target — retry if not
    let sameCount = 0;
    let lastTop = -1;
    let rafId: number;
    const checkDone = () => {
      const cur = scrollRef.current;
      if (!cur) return;
      if (cur.scrollTop === lastTop) {
        sameCount++;
        if (sameCount >= 3) {
          const dist = Math.abs(cur.scrollTop - targetTop);
          if (dist > 2) {
            // Scroll stopped short — retry
            sameCount = 0;
            lastTop = -1;
            cur.scrollTo({ top: targetTop, behavior: 'smooth' });
            rafId = requestAnimationFrame(checkDone);
            return;
          }
          // Reached target — restore snap
          cur.style.scrollSnapType = snapType;
          scrollingByStore.current = false;
          return;
        }
      } else {
        sameCount = 0;
        lastTop = cur.scrollTop;
      }
      rafId = requestAnimationFrame(checkDone);
    };
    rafId = requestAnimationFrame(checkDone);

    return () => {
      cancelAnimationFrame(rafId);
      if (scrollRef.current) {
        scrollRef.current.style.scrollSnapType = snapType;
      }
    };
  }, [currentIndex, snapType]);

  const isTouchingRef = useRef(false);
  const momentumSettlingRef = useRef(false);

  // Mobile touch: suppress store sync during touch, sync once after momentum settles
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
  }, [goToSection]);

  // Scroll → store: debounced sync (100ms delay, skipped during touch & momentum)
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleScroll = useCallback(() => {
    if (scrollingByStore.current || isTouchingRef.current || momentumSettlingRef.current) return;
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
    debounceTimerRef.current = setTimeout(() => {
      const el = scrollRef.current;
      if (!el) return;
      const vh = el.clientHeight;
      const idx = Math.round(el.scrollTop / vh);
      if (idx !== currentIndex && idx >= 0 && idx < sections.length) {
        goToSection(idx);
      }
    }, 100);
  }, [currentIndex, sections.length, goToSection]);

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  return (
    <Box
      ref={scrollRef}
      onScroll={handleScroll}
      sx={{
        width: '100%',
        height: '100%',
        overflowY: 'scroll',
        scrollSnapType: snapType,
        '&::-webkit-scrollbar': { display: 'none' },
        scrollbarWidth: 'none',
      }}
    >
      {sections.map((section, _idx) => (
        <Box
          key={String(section)}
          sx={{
            height: { xs: '100dvh', md: '100vh' },
            scrollSnapAlign: isMobile ? undefined : 'start',
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
              px: 0.5,
              '&::-webkit-scrollbar': { display: 'none' },
              scrollbarWidth: 'none',
            }}
          >
            <Paper
              elevation={0}
              sx={{
                width: '100%',
                p: { xs: 2.5, md: 4 },
                borderRadius: 3,
                border: '1px solid',
                borderColor: 'rgba(255,255,255,0.08)',
                bgcolor: 'rgba(22,33,62,0.6)',
                backdropFilter: 'blur(12px)',
                overflow: 'visible',
                animation: `cardFloat ${floatRef.current.duration}s cubic-bezier(0.45,0,0.55,1) ${floatRef.current.delay}s infinite`,
                '&:hover': { animationPlayState: 'paused' },
              }}
            >
              <Box className="card-accent" sx={{ pt: 1 }}>
                {renderSection(section)}
              </Box>
            </Paper>
          </Box>
        </Box>
      ))}
    </Box>
  );
}

export default SectionRoller;
