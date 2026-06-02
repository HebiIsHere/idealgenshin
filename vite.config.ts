import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  worker: {
    format: 'es',
  },
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: {
      '/enka-api': {
        target: 'https://enka.network',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/enka-api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[vite proxy] enka-api error:', err.message);
          });
        },
      },
      '/minigg-api': {
        target: 'https://profile.microgg.cn',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/minigg-api/, ''),
        configure: (proxy) => {
          proxy.on('error', (err) => {
            console.warn('[vite proxy] minigg-api error:', err.message);
          });
        },
      },
    },
  },
  preview: {
    host: '0.0.0.0',
    port: 4173,
    headers: {
      'Cache-Control': 'no-store',
    },
  },
  build: {
    target: 'esnext',
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-dom') || id.includes('/react/') || id.endsWith('react.js') || id.endsWith('react/index.js')) {
              return 'vendor';
            }
            if (id.includes('@mui')) {
              return 'mui';
            }
            if (id.includes('recharts')) {
              return 'recharts';
            }
            if (id.includes('react-router') || id.includes('@remix-run/router')) {
              return 'vendor';
            }
            if (id.includes('react-window')) {
              return 'vendor';
            }
          }
        },
      },
    },
  },
  optimizeDeps: {
    include: [
      'react', 'react-dom', 'react-router-dom',
      '@mui/material', '@mui/material/styles',
      'zustand', 'recharts', 'comlink', 'uuid',
    ],
  },
});
