import React from 'react';
import Box from '@mui/material/Box';
import { useWizardStore, type WizardSection, WIZARD_SECTIONS } from '../../store/slices/wizardSlice';

interface SectionRollerProps {
  /** Render function for each section */
  renderSection: (section: WizardSection) => React.ReactNode;
}

function SectionRoller({ renderSection }: SectionRollerProps): React.ReactElement {
  const currentIndex = useWizardStore((s) => s.currentIndex);
  const sections = useWizardStore((s) => s.sections);
  const nextSection = useWizardStore((s) => s.nextSection);

  return (
    <Box
      sx={{
        position: 'relative',
        width: '100%',
        height: '100vh',
        overflow: 'hidden',
      }}
    >
      {/* 滚筒容器 */}
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          transition: 'transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
          transform: `translateY(-${currentIndex * 100}vh)`,
        }}
      >
        {sections.map((section) => (
          <Box
            key={String(section)}
            sx={{
              height: '100vh',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              px: { xs: 2, md: 4 },
            }}
          >
            <Box sx={{ width: '100%', maxWidth: 680, mx: 'auto' }}>
              {renderSection(section)}
            </Box>
          </Box>
        ))}
      </Box>
    </Box>
  );
}

export default SectionRoller;
