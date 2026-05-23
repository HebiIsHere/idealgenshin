import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  // Use important to ensure Tailwind utilities can override MUI styles when needed
  important: false,
  corePlugins: {
    // Disable Tailwind's preflight to avoid conflicts with MUI's CSS reset
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        genshin: {
          gold: '#D4A843',
          'gold-light': '#E8C96A',
          'gold-dark': '#A07830',
          pyro: '#EF7938',
          hydro: '#4CC2F1',
          cryo: '#9FD6E3',
          electro: '#D09FF0',
          anemo: '#74C2A8',
          geo: '#F0B640',
          dendro: '#A5C83B',
          bg: '#1A1A2E',
          'bg-secondary': '#16213E',
          'bg-card': '#0F3460',
          surface: '#1E1E3A',
          'surface-hover': '#2A2A4A',
          text: '#E0E0E0',
          'text-secondary': '#A0A0B0',
        },
      },
      fontFamily: {
        sans: [
          '"Microsoft YaHei"',
          '"PingFang SC"',
          '"Noto Sans SC"',
          '"Hiragino Sans GB"',
          'sans-serif',
        ],
      },
    },
  },
  plugins: [],
};

export default config;
