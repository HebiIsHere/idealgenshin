import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { ThemeProvider, CssBaseline } from '@mui/material';
import App from './App';
import { genshinTheme } from './theme';
import './index.css';

// 启动计时 — 追踪各阶段耗时
const T0 = performance.now();
const logStage = (name: string) => {
  const ms = (performance.now() - T0).toFixed(4);
  console.log(`[boot] ${name}: +${ms}ms`);
};
logStage('main.tsx evaluated');

/** Error boundary to catch and display runtime errors instead of white screen. */
class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { error: Error | null; errorInfo: React.ErrorInfo | null }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('App crashed:', error, errorInfo);
    this.setState({ errorInfo });
  }

  render() {
    if (this.state.error) {
      return (
        <div style={{ padding: 24, color: '#EF7938', fontFamily: 'monospace', whiteSpace: 'pre-wrap', background: '#1A1A2E', minHeight: '100vh' }}>
          <h1>应用出错</h1>
          <p><strong>{this.state.error.toString()}</strong></p>
          <p>组件栈：</p>
          <p>{this.state.errorInfo?.componentStack}</p>
          <button onClick={() => window.location.reload()} style={{ padding: '8px 16px', cursor: 'pointer', marginTop: 16 }}>
            重新加载
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const rootElement = document.getElementById('root');

if (!rootElement) {
  throw new Error('Root element not found. Ensure there is a <div id="root"> in index.html.');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <ErrorBoundary>
      <BrowserRouter>
        <ThemeProvider theme={genshinTheme}>
          <CssBaseline />
          <App />
        </ThemeProvider>
      </BrowserRouter>
    </ErrorBoundary>
  </React.StrictMode>,
);

logStage('ReactDOM.createRoot().render() called');
