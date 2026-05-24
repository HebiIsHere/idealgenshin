import React, { useState, useEffect, useRef } from 'react';
import Box from '@mui/material/Box';
import Paper from '@mui/material/Paper';
import { useWizardStore, type WizardSection } from '../../store/slices/wizardSlice';

interface SectionRollerProps {
  renderSection: (section: WizardSection) => React.ReactNode;
}

function SectionRoller({ renderSection }: SectionRollerProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const [displayed, setDisplayed] = useState(currentIndex);
  const [animating, setAnimating] = useState(false);
  const prevIndex = useRef(currentIndex);

  useEffect(() => {
    if (currentIndex !== prevIndex.current) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setDisplayed(currentIndex);
        setAnimating(false);
      }, 160);
      prevIndex.current = currentIndex;
      return () => clearTimeout(timer);
    }
  }, [currentIndex]);

  return (
    <Box
      sx={{
        width: '100%',
        height: '100vh',
        display: 'flex',
        alignItems: 'flex-start',
        justifyContent: 'center',
        overflowY: 'auto',
        px: { xs: 2, md: 6 },
        py: { xs: 4, md: 6 },
        '&::-webkit-scrollbar': { width: 4 },
        '&::-webkit-scrollbar-thumb': { background: 'rgba(212,168,67,0.15)', borderRadius: 2 },
      }}
    >
      <Paper
        elevation={0}
        sx={{
          width: '100%',
          maxWidth: 600,
          p: { xs: 3, md: 5 },
          borderRadius: 3,
          border: '1px solid',
          borderColor: 'rgba(212,168,67,0.1)',
          bgcolor: 'rgba(22,33,62,0.6)',
          backdropFilter: 'blur(12px)',
          opacity: animating ? 0 : 1,
          transform: animating ? 'translateY(16px)' : 'translateY(0)',
          transition: 'opacity 160ms cubic-bezier(0.16,1,0.3,1), transform 160ms cubic-bezier(0.16,1,0.3,1)',
          my: 'auto',
        }}
      >
        {renderSection(sections[displayed] ?? sections[currentIndex])}
      </Paper>
    </Box>
  );
}

export default SectionRoller;
