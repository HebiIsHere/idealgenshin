import React from 'react';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';

interface Props { children: React.ReactNode; }
interface State { error: Error | null; }

class ErrorBoundary extends React.Component<Props, State> {
  state: State = { error: null };
  static getDerivedStateFromError(e: Error) { return { error: e }; }
  render() {
    if (this.state.error) {
      return (
        <Box sx={{ p: 2, color: 'error.main', fontSize: '0.75rem' }}>
          <Typography variant="caption" color="error">渲染出错：{this.state.error.message}</Typography>
        </Box>
      );
    }
    return this.props.children;
  }
}

export default ErrorBoundary;
