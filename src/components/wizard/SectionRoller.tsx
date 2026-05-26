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
@keyframes slideOutR { from { transform: translateX(0); opacity: 1; } to { transform: translateX(-48px); opacity: 0; } }
@keyframes slideInR  { from { transform: translateX(48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
@keyframes slideOutL { from { transform: translateX(0); opacity: 1; } to { transform: translateX(48px); opacity: 0; } }
@keyframes slideInL  { from { transform: translateX(-48px); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
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

  useEffect(() => {
    const thisKey = sections[currentIndex] ?? '';
    if (thisKey === prevKey.current) return;
    const prevIdx = sections.indexOf(prevKey.current);
    setSlideDir(currentIndex >= prevIdx ? 'right' : 'left');
    // 切换时滚到顶部，避免不同高度卡片导致的跳动
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
    setIncomingIdx(currentIndex);
    setAnimating(true);

    const timer = setTimeout(() => {
      setActiveIdx(currentIndex);
      setIncomingIdx(null);
      setAnimating(false);
      prevKey.current = thisKey;
    }, ANIM_MS);
    return () => clearTimeout(timer);
  }, [currentIndex, sections]);

  const dir = slideDir === 'right' ? 'right' : 'left';
  const oldCls = `section-old-${dir}`;
  const newCls = `section-new-${dir}`;

  const card = (idx: number, cls: string, abs: boolean) => {
    const key = sections[idx];
    if (!key) return null;
    return (
      <Box
        className={cls || undefined}
        sx={{
          width: '100%',
          maxWidth: 600,
          flexShrink: 0,
          ...(abs ? { position: 'absolute', inset: 0, display: 'flex', justifyContent: 'center' } : {}),
        }}
      >
        <Paper
          elevation={0}
          sx={{
            width: '100%',
            p: { xs: 3, md: 4 },
            borderRadius: 3,
            border: '1px solid',
            borderColor: 'rgba(212,168,67,0.1)',
            bgcolor: 'rgba(22,33,62,0.6)',
            backdropFilter: 'blur(12px)',
            overflow: 'visible',
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
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        px: { xs: 1.5, md: 6 },
        py: { xs: 4, md: 6 },
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.15)', borderRadius: 2 },
      }}
    >
      <style>{STYLE}</style>
      <Box sx={{ position: 'relative', width: '100%', maxWidth: 600, my: 'auto' }}>
        {(incomingIdx != null ? card(incomingIdx, newCls, false) : card(activeIdx, '', false))}
        {animating && incomingIdx != null && card(activeIdx, oldCls, true)}
      </Box>
    </Box>
  );
}

export default SectionRoller;
