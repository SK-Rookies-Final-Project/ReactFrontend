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
          target: env.VITE_PROM_URL || 'http://3.36.76.198:9090',
          changeOrigin: true,
          secure: false,
          rewrite: (path: string) => path.replace(/^\/prom/, ''),
          configure: (proxy, options) => {
            proxy.on('error', (err, req, res) => {
              console.log('🚨 Prometheus proxy error:', err.message);
            });
          },
        },
      },
    },
  };
});
