import { createTheme } from '@mui/material/styles';

/**
 * 原神主题 v4.1 — 芙宁娜
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
const gold = {
  light: '#E2C87A',
  mid: '#C9A84C',
  deep: '#9A7B2E',
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
      main: gold.mid,
      light: gold.light,
      dark: gold.deep,
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
    subtitle1: { color: gold.mid },
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
          borderRadius: 8,
          padding: '8px 24px',
          '&:focus-visible': {
            outline: `2px solid ${hydro.mid}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${hydro.mid} 0%, ${hydro.deep} 100%)`,
          boxShadow: `0 2px 8px rgba(91, 192, 235, 0.25)`,
          transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
          '&:hover': {
            background: `linear-gradient(135deg, ${hydro.light} 0%, ${hydro.mid} 100%)`,
            boxShadow: `0 0 20px rgba(91, 192, 235, 0.5), 0 4px 12px rgba(91, 192, 235, 0.3)`,
          },
          '&:active': {
            transform: 'scale(0.97)',
            boxShadow: `0 1px 4px rgba(91, 192, 235, 0.3)`,
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
            boxShadow: '0 4px 24px rgba(212,168,67,0.14)',
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
      },
    },
    MuiMenu: {
      styleOverrides: {
        paper: {
          transition: 'opacity 200ms cubic-bezier(0.16,1,0.3,1), transform 200ms cubic-bezier(0.16,1,0.3,1) !important',
        },
      },
    },
    MuiTooltip: {
      styleOverrides: {
        tooltip: {
          backgroundColor: '#0F1629',
          border: `1px solid rgba(212, 168, 67, 0.25)`,
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
