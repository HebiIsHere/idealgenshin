import { Routes, Route, Navigate } from 'react-router-dom';
import AppLayout from './components/layout/AppLayout';
import CharacterAnalyzerPage from './components/optimizer/CharacterAnalyzerPage';

/** Root application component — sets up routing and layout. */
function App(): React.ReactElement {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<Navigate to="/analyzer" replace />} />
        <Route path="/analyzer" element={<CharacterAnalyzerPage />} />
        {/* Fallback: redirect unknown routes to analyzer */}
        <Route path="*" element={<Navigate to="/analyzer" replace />} />
      </Route>
    </Routes>
  );
}

export default App;
