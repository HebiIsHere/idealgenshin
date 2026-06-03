import { createTheme } from '@mui/material/styles';

/**
 * 原神主题 v4.3.0 — 芙宁娜
 * - 水蓝主色 + 金色点缀 + 深海军蓝背景
 * - Noto Serif SC 衬线体标题 + Noto Sans SC 正文
 */

// 芙宁娜水蓝体系（主色）
const hydro = {
  light: '#8DD5F5',   // 浅水蓝：高亮文字、图标发光
  mid: '#5BC0EB',     // 中水蓝：主色
  deep: '#3AA0C8',    // 深水蓝：渐变终点
};

// 金色点缀（芙宁娜冠冕/饰品）
const celadon = {
  light: '#EDF4F1',
  mid: '#D0E4DC',
  deep: '#A0BEB4',
};

export const genshinTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: hydro.mid,
      light: hydro.light,
      dark: hydro.deep,
      contrastText: '#0D1B32',
    },
    secondary: {
      main: celadon.mid,
      light: celadon.light,
      dark: celadon.deep,
      contrastText: '#0D1B32',
    },
    background: {
      default: '#0B1424',
      paper: '#0F1D35',
    },
    text: {
      primary: '#F0F2F6',
      secondary: '#B0B8C4',
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
      main: hydro.mid,
    },
    divider: 'rgba(255,255,255,0.1)',
  },
  typography: {
    fontFamily: '"Noto Sans SC", "PingFang SC", "Microsoft YaHei", "Hiragino Sans GB", sans-serif',
    // 标题使用衬线体，正文使用无衬线体
    h1: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 700, letterSpacing: '0.04em' },
    h2: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 200, letterSpacing: '0.08em' },
    h3: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 700 },
    h4: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 700, letterSpacing: '0.02em' },
    h5: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 600 },
    h6: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 600 },
    subtitle1: { color: celadon.mid },
    subtitle2: { fontFamily: '"Noto Serif SC", "PingFang SC", serif', fontWeight: 600 },
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
          borderRadius: 999,
          padding: '10px 28px',
          '&:focus-visible': {
            outline: `2px solid #94CFF0`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          position: 'relative',
          overflow: 'hidden',
          '& .MuiTouchRipple-root': { display: 'none' },
          color: '#000030',
          background: 'linear-gradient(135deg, #94CFF0 0%, #2850A0 100%)',
          border: 'none',
          borderRadius: 999,
          boxShadow: '0 0 24px rgba(148,207,240,0.35), 0 0 0 2px rgba(208,228,220,0.12)',
          transition: 'transform 200ms cubic-bezier(0.34,1.56,0.64,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1)',
          '&:hover': {
            transform: 'translateY(-3px)',
            background: 'linear-gradient(135deg, #94CFF0 0%, #2850A0 100%)',
            boxShadow: '0 0 44px rgba(148,207,240,0.45), 0 0 0 3px rgba(208,228,220,0.25)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.97)',
            boxShadow: '0 0 16px rgba(148,207,240,0.35), 0 0 0 1px rgba(208,228,220,0.12)',
          },
          '&.Mui-disabled': {
            color: 'rgba(0,0,48,0.4)',
            background: 'rgba(148,207,240,0.3)',
            boxShadow: 'none',
          },
        },
        outlined: {
          color: '#D0E8EF',
          border: '1px solid rgba(40,80,160,0.30)',
          borderRadius: 12,
          padding: '8px 20px',
          fontWeight: 500,
          '&:hover': {
            borderColor: '#94CFF0',
            background: 'rgba(148,207,240,0.06)',
            transform: 'translateY(-1px)',
          },
          '&:active': {
            transform: 'translateY(0) scale(0.98)',
          },
        },
        outlinedPrimary: {
          color: '#D0E8EF',
          border: '1px solid rgba(40,80,160,0.30)',
          '&:hover': {
            borderColor: '#94CFF0',
            background: 'rgba(148,207,240,0.06)',
          },
        },
        sizeSmall: {
          padding: '3px 14px',
          fontSize: '0.8rem',
          borderRadius: 999,
          '&.MuiButton-containedPrimary': {
            padding: '4px 16px',
            boxShadow: '0 0 10px rgba(148,207,240,0.2)',
            '&:hover': {
              boxShadow: '0 0 20px rgba(148,207,240,0.3), 0 0 0 1px rgba(208,228,220,0.15)',
              transform: 'translateY(-1px)',
            },
            '&:active': {
              transform: 'translateY(0) scale(0.98)',
              boxShadow: '0 0 8px rgba(148,207,240,0.2)',
            },
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          position: 'relative',
          backgroundImage: 'none',
          border: `1px solid rgba(255,255,255,0.08)`,
          overflow: 'hidden',
          transition: 'box-shadow 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
            pointerEvents: 'none',
          },
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.2)',
            boxShadow: '0 4px 24px rgba(91,192,235,0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          backgroundImage: 'none',
          border: `1px solid rgba(255,255,255,0.08)`,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          transition: 'box-shadow 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 15%, rgba(255,255,255,0.1) 50%, transparent 100%)`,
            pointerEvents: 'none',
          },
          '&:hover': {
            borderColor: 'rgba(255,255,255,0.2)',
            boxShadow: '0 4px 24px rgba(208,228,220,0.14)',
          },
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        variant: 'outlined',
        size: 'small',
      },
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root:focus-visible': {
            outline: `2px solid ${hydro.mid}`,
            outlineOffset: 0,
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: hydro.mid,
            borderWidth: 2,
          },
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          transition: 'all 200ms cubic-bezier(0.16,1,0.3,1)',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.12)',
            transition: 'border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.25)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: hydro.mid,
            borderWidth: 2,
          },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(255,255,255,0.05)',
          },
          '& input[type=number]': {
            textAlign: 'center',
            MozAppearance: 'textfield',
            '&::-webkit-inner-spin-button, &::-webkit-outer-spin-button': {
              WebkitAppearance: 'none',
              margin: 0,
            },
          },
        },
      },
    },
    MuiSelect: {
      defaultProps: {
        size: 'small',
      },
      styleOverrides: {
        root: {
          transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          '&:focus-visible': {
            outline: `2px solid ${hydro.mid}`,
            outlineOffset: 1,
          },
        },
        icon: {
          transition: 'transform 250ms cubic-bezier(0.34,1.56,0.64,1)',
        },
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          transition: 'opacity 250ms cubic-bezier(0.16,1,0.3,1), transform 250ms cubic-bezier(0.16,1,0.3,1) !important',
          '&.MuiMenu-paper': {
            animation: 'menuEnter 250ms cubic-bezier(0.16,1,0.3,1) both',
            '@keyframes menuEnter': {
              from: { opacity: 0, transform: 'translateY(-8px) scale(0.96)' },
              to:   { opacity: 1, transform: 'translateY(0) scale(1)' },
            },
          },
        },
      },
    },
    MuiMenuItem: {
      styleOverrides: {
        root: {
          transition: 'background-color 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1)',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F1629',
          border: `1px solid rgba(208, 228, 220, 0.25)`,
          fontSize: '0.8rem',
        },
      },
    },
    MuiDivider: {
      styleOverrides: {
        root: {
          borderColor: 'rgba(255,255,255,0.08)',
        },
      },
    },
    MuiIconButton: {
      styleOverrides: {
        root: {
          transition: 'transform 150ms cubic-bezier(0.16,1,0.3,1), color 150ms cubic-bezier(0.16,1,0.3,1)',
          '&:active': {
            transform: 'scale(0.85)',
          },
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          fontWeight: 500,
          transition: 'all 150ms cubic-bezier(0.16,1,0.3,1)',
          '&:hover': {
            transform: 'scale(1.04)',
          },
          '&:active': {
            transform: 'scale(0.96)',
          },
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        subtitle2: {
          '&::before': {
            content: '"◆ "',
            color: '#C8D0D8',
            fontSize: '0.65em',
            marginRight: 2,
            verticalAlign: 'middle',
          },
        },
      },
    },
  },
});

export default genshinTheme;
