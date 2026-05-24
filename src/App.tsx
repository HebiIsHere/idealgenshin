import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CharacterAnalyzerPage from './components/optimizer/CharacterAnalyzerPage';
import LandingPage from './pages/LandingPage';
import WizardPage from './pages/WizardPage';
import { useWizardStore } from './store/slices/wizardSlice';

/** Root application component — sets up routing and layout. */
function App(): React.ReactElement {
  const wizardActive = useWizardStore((s) => s.active);

  // 向导模式：不使用 AppLayout（无 Header）
  if (wizardActive) {
    return <WizardPage />;
  }

  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<LandingPage />} />
        <Route path="/analyzer" element={<CharacterAnalyzerPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
