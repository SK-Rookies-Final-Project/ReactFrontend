import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    exclude: ['lucide-react'],
  },
  server: {
    proxy: {
      '/prom': {
        target: 'http://13.125.209.134:9090',
        changeOrigin: true,
        rewrite: p => p.replace(/^\/prom/, '')
      }
    }
  }
});
