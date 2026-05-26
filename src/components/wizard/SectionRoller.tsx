import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';

interface SectionRollerProps {
  renderSection: (section: WizardSection) => React.ReactNode;
}

const ANIM_MS = 380;

const STYLE = `
.section-old-left  { animation: slideOutL ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1) forwards; pointer-events: none; }
.section-new-left  { animation: slideInL  ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1) forwards; }
.section-old-right { animation: slideOutR ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1) forwards; pointer-events: none; }
.section-new-right { animation: slideInR  ${ANIM_MS}ms cubic-bezier(0.22,1,0.36,1) forwards; }
@keyframes slideOutR { from { transform: translateX(0) scale(1); opacity: 1; } to { transform: translateX(-32px) scale(0.97); opacity: 0; } }
@keyframes slideInR  { from { transform: translateX(32px) scale(0.97); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
@keyframes slideOutL { from { transform: translateX(0) scale(1); opacity: 1; } to { transform: translateX(32px) scale(0.97); opacity: 0; } }
@keyframes slideInL  { from { transform: translateX(-32px) scale(0.97); opacity: 0; } to { transform: translateX(0) scale(1); opacity: 1; } }
@media (prefers-reduced-motion: reduce) {
  .section-old-left, .section-new-left, .section-old-right, .section-new-right { animation: none !important; opacity: 1 !important; transform: none !important; }
}
`;

function SectionRoller({ renderSection }: SectionRollerProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);

  const [animating, setAnimating] = useState(false);
  const [slideDir, setSlideDir] = useState<'left' | 'right'>('right');
  const [activeIdx, setActiveIdx] = useState(currentIndex);
  const [incomingIdx, setIncomingIdx] = useState<number | null>(null);
  const prevKey = useRef(sections[currentIndex] ?? '');

  const scrollRef = useRef<HTMLDivElement>(null);

  // Stable random float params
  const floatRef = useRef({ duration: 5.5 + Math.random() * 2, delay: Math.random() * 2 });

  useEffect(() => {
    const thisKey = sections[currentIndex] ?? '';
    if (thisKey === prevKey.current) return;
    const prevIdx = sections.indexOf(prevKey.current);
    setSlideDir(currentIndex >= prevIdx ? 'right' : 'left');
    // 记录切换前卡片中心位置
    const container = scrollRef.current;
    const prevCenter = container ? container.scrollTop + container.clientHeight / 2 : 0;
    if (container) container.scrollTop = 0;
    setIncomingIdx(currentIndex);
    setAnimating(true);

    const timer = setTimeout(() => {
      setActiveIdx(currentIndex);
      setIncomingIdx(null);
      setAnimating(false);
      prevKey.current = thisKey;
      // 补偿高度差：保持中心点不变
      requestAnimationFrame(() => {
        if (container) {
          const newCenter = container.scrollHeight / 2;
          container.scrollTop = Math.max(0, newCenter - prevCenter + container.scrollTop);
        }
      });
    }, ANIM_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, sections]);

  const dir = slideDir === 'right' ? 'right' : 'left';
  const oldCls = `section-old-${dir}`;
  const newCls = `section-new-${dir}`;

  const card = (idx: number, cls: string) => {
    const key = sections[idx];
    if (!key) return null;
    return (
      <Box
        className={cls || undefined}
        sx={{
          width: '100%',
          maxWidth: 600,
          flexShrink: 0,
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
            '&:hover': {
              animationPlayState: 'paused',
            },
          }}
        >
          <Box className="card-accent" sx={{ pt: 1 }}>
            {renderSection(key)}
          </Box>
        </Paper>
      </Box>
    );
  };

  return (
    <Box
      ref={scrollRef}
      sx={{
        width: '100%',
        height: { xs: 'auto', md: '100vh' },
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'scroll',
        px: { xs: 1.5, md: 6 },
        py: { xs: 6, md: 6 },
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.15)', borderRadius: 2 },
      }}
    >
      <style>{STYLE}</style>
      <Box sx={{
        position: 'relative', width: '100%', maxWidth: 600,
        mt: 'auto', mb: 'auto',
      }}>
        <Box sx={{ display: 'grid', '& > *': { gridArea: '1/1' } }}>
          {animating && incomingIdx != null ? (
            <>
              {card(activeIdx, oldCls)}
              {card(incomingIdx, newCls)}
            </>
          ) : (
            card(activeIdx, '')
          )}
        </Box>
      </Box>
    </Box>
  );
}

export default SectionRoller;
