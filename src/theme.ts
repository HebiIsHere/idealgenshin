import { createTheme } from '@mui/material/styles';

/**
 * Genshin Impact inspired MUI theme.
 * - Dark background with gold accents
 * - Chinese-friendly font stack
 * - Custom component overrides for a game-UI feel
 */
export const genshinTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#D4A843',
      light: '#E8C96A',
      dark: '#A07830',
      contrastText: '#1A1A2E',
    },
    secondary: {
      main: '#4CC2F1',
      light: '#7DD5F7',
      dark: '#2FA0CC',
      contrastText: '#1A1A2E',
    },
    background: {
      default: '#1A1A2E',
      paper: '#16213E',
    },
    text: {
      primary: '#E0D8CC',
      secondary: '#A09888',
    },
    error: {
      main: '#EF7938',
    },
    success: {
      main: '#74C2A8',
    },
    warning: {
      main: '#F0B640',
    },
    info: {
      main: '#4CC2F1',
    },
    divider: 'rgba(212, 168, 67, 0.12)',
  },
  typography: {
    fontFamily: '"Microsoft YaHei", "PingFang SC", "Noto Sans SC", "Hiragino Sans GB", sans-serif',
    h4: {
      fontWeight: 700,
      letterSpacing: '0.02em',
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
    subtitle1: {
      color: '#D4A843',
    },
  },
  shape: {
    borderRadius: 8,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          fontWeight: 600,
          borderRadius: 8,
          padding: '8px 24px',
        },
        containedPrimary: {
          background: 'linear-gradient(135deg, #D4A843 0%, #A07830 100%)',
          boxShadow: '0 2px 8px rgba(212, 168, 67, 0.3)',
          '&:hover': {
            background: 'linear-gradient(135deg, #E8C96A 0%, #D4A843 100%)',
            boxShadow: '0 4px 12px rgba(212, 168, 67, 0.4)',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(212, 168, 67, 0.08)',
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          border: '1px solid rgba(212, 168, 67, 0.08)',
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.3)',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F3460',
          border: '1px solid rgba(212, 168, 67, 0.2)',
          fontSize: '0.8rem',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
        },
      },
    },
  },
});

export default genshinTheme;
