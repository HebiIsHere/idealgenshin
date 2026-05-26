import { createTheme } from '@mui/material/styles';

/**
 * 原神风格 MUI 主题 v3.1
 * - 深蓝黑底 + 三档金色体系 + 星蓝点缀
 * - Noto Serif SC 衬线体标题 + Noto Sans SC 正文
 * - 金色渐变按钮 + 发光交互
 */

// 金色体系（三档）
const gold = {
  light: '#F0D68C',   // 浅金：高亮文字、图标发光
  mid: '#D4A843',     // 中金：主色
  deep: '#A67C2E',    // 深金：边框暗面、渐变终点
};

// 星蓝点缀
const starBlue = '#5BC0EB';

export const genshinTheme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: gold.mid,
      light: gold.light,
      dark: gold.deep,
      contrastText: '#0F1629',
    },
    secondary: {
      main: starBlue,
      light: '#8DD5F5',
      dark: '#3AA0C8',
      contrastText: '#0F1629',
    },
    background: {
      default: '#0F1629',
      paper: '#141E33',
    },
    text: {
      primary: '#E6DCC8',
      secondary: '#A09880',
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
      main: starBlue,
    },
    divider: 'rgba(212, 168, 67, 0.14)',
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
            outline: `2px solid ${gold.mid}`,
            outlineOffset: 2,
          },
        },
        containedPrimary: {
          background: `linear-gradient(135deg, ${gold.mid} 0%, ${gold.deep} 100%)`,
          boxShadow: `0 2px 8px rgba(212, 168, 67, 0.25)`,
          transition: 'all 250ms cubic-bezier(0.16,1,0.3,1)',
          '&:hover': {
            background: `linear-gradient(135deg, ${gold.light} 0%, ${gold.mid} 100%)`,
            boxShadow: `0 0 20px rgba(212, 168, 67, 0.5), 0 4px 12px rgba(212, 168, 67, 0.3)`,
          },
          '&:active': {
            boxShadow: `0 1px 4px rgba(212, 168, 67, 0.3)`,
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          position: 'relative',
          backgroundImage: 'none',
          border: `1px solid rgba(212, 168, 67, 0.1)`,
          overflow: 'hidden',
          transition: 'box-shadow 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.5) 15%, rgba(212,168,67,0.12) 50%, transparent 100%)`,
            pointerEvents: 'none',
          },
          '&:hover': {
            borderColor: 'rgba(212,168,67,0.3)',
            boxShadow: '0 4px 24px rgba(212,168,67,0.12)',
          },
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          position: 'relative',
          backgroundImage: 'none',
          border: `1px solid rgba(212, 168, 67, 0.1)`,
          boxShadow: '0 2px 12px rgba(0, 0, 0, 0.4)',
          overflow: 'hidden',
          transition: 'box-shadow 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          '&::before': {
            content: '""',
            position: 'absolute',
            top: 0, left: 0, right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent 0%, rgba(212,168,67,0.5) 15%, rgba(212,168,67,0.12) 50%, transparent 100%)`,
            pointerEvents: 'none',
          },
          '&:hover': {
            borderColor: 'rgba(212,168,67,0.3)',
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
            outline: `2px solid ${gold.mid}`,
            outlineOffset: 0,
          },
          '& .MuiOutlinedInput-root.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: gold.mid,
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
            borderColor: 'rgba(212,168,67,0.15)',
            transition: 'border-color 200ms cubic-bezier(0.16,1,0.3,1)',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(212,168,67,0.35)',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: gold.mid,
            borderWidth: 2,
          },
          '&.Mui-disabled .MuiOutlinedInput-notchedOutline': {
            borderColor: 'rgba(212,168,67,0.06)',
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
          '&:focus-visible': {
            outline: `2px solid ${gold.mid}`,
            outlineOffset: 1,
          },
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
          borderColor: 'rgba(212, 168, 67, 0.1)',
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
    MuiTypography: {
      styleOverrides: {
        subtitle2: {
          '&::before': {
            content: '"◆ "',
            color: '#D4A843',
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
