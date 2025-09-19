import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  // Vite에서 환경 변수를 로드할 때 현재 작업 디렉토리 사용
  const env = loadEnv(mode, '.', '');

  return {
    plugins: [react()],
    optimizeDeps: {
      exclude: ['lucide-react'],
    },
    server: {
      proxy: {
        '/prom': {
          target: env.VITE_PROM_URL,
          changeOrigin: true,
          // if Prometheus is behind HTTPS with a self-signed cert, you may need:
          // secure: false,
          rewrite: (path: string) => path.replace(/^\/prom/, ''),
        },
      },
    },
  };
});
