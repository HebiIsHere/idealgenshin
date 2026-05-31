import { lazy, Suspense, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import LandingPage from './pages/LandingPage';
import { useWizardStore } from './store/slices/wizardSlice';
import { decodeBuildFromHash } from './utils/share';

const WizardPage = lazy(() => import('./pages/WizardPage'));

const ANIM_MS = 400;

function App(): React.ReactElement {
  const wizardActive = useWizardStore((s) => s.active);
  const enterWizard = useWizardStore((s) => s.enterWizard);

  // Auto-enter wizard if shared config hash is present — dynamic import to keep main bundle lean
  useEffect(() => {
    if (!wizardActive && window.location.hash) {
      const payload = decodeBuildFromHash(window.location.hash);
      if (payload) {
        import('./utils/applyShare').then(({ applySharePayload }) => {
          applySharePayload(payload);
          enterWizard();
        });
      }
    }
  }, [wizardActive, enterWizard]);

  return (
    <Box>
      {wizardActive ? (
        <Box
          sx={{
            animation: `slideUp ${ANIM_MS}ms cubic-bezier(0.16,1,0.3,1) both`,
            '@media (prefers-reduced-motion: reduce)': { animation: 'none' },
          }}
        >
          <Suspense fallback={
            <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', gap: 3, bgcolor: '#0B1424' }}>
              <div className="spinner-ring" />
              <Typography sx={{ color: 'rgba(208,232,239,0.55)', fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: 0 }}>
                加载中
                <span className="loading-dots">
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                  <span className="loading-dot" />
                </span>
              </Typography>
            </Box>
          }>
            <WizardPage />
          </Suspense>
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
