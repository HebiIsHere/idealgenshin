import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { keyframes } from '@mui/system';
import Box from '@mui/material/Box';
import LandingPage from './pages/LandingPage';
import WizardPage from './pages/WizardPage';
import { useWizardStore } from './store/slices/wizardSlice';

const slideUp = keyframes`
  from { transform: translateY(32px); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
`;

const ANIM_MS = 400;

function App(): React.ReactElement {
  const wizardActive = useWizardStore((s) => s.active);

  return (
    <Box>
      {wizardActive ? (
        <Box
          sx={{
            animation: `${slideUp} ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1) both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <WizardPage />
        </Box>
      ) : (
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="*" element={<LandingPage />} />
        </Routes>
      )}
    </Box>
  );
}

export default App;
