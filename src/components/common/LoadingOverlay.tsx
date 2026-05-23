import React from 'react';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CircularProgress from '@mui/material/CircularProgress';
import LinearProgress from '@mui/material/LinearProgress';

interface LoadingOverlayProps {
  /** Whether the overlay is visible. */
  visible: boolean;
  /** Progress value (0-1). */
  progress?: number;
  /** Message to display. */
  message?: string;
}

/** Full-screen loading overlay for Web Worker calculations. */
function LoadingOverlay({
  visible,
  progress,
  message = '正在计算中…',
}: LoadingOverlayProps): React.ReactElement | null {
  if (!visible) return null;

  return (
    <Box
      sx={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'rgba(26, 26, 46, 0.85)',
        backdropFilter: 'blur(4px)',
      }}
    >
      <CircularProgress size={48} sx={{ color: 'primary.main', mb: 3 }} />
      <Typography variant="h6" sx={{ color: 'text.primary', mb: 2 }}>
        {message}
      </Typography>
      {progress !== undefined && (
        <Box sx={{ width: 300 }}>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(212, 168, 67, 0.1)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(90deg, #D4A843, #E8C96A)',
              },
            }}
          />
          <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block', textAlign: 'center' }}>
            {Math.round(progress * 100)}%
          </Typography>
        </Box>
      )}
    </Box>
  );
}

export default LoadingOverlay;
