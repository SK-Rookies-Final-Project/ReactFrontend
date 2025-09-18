import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

// Node.js types for vite config
declare const console: {
  log: (...args: unknown[]) => void;
};



// https://vitejs.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');

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
          rewrite: (path) => path.replace(/^\/prom/, ''),
          configure: (proxy: unknown) => {
            const proxyInstance = proxy as {
              on: (event: string, callback: (...args: unknown[]) => void) => void;
            };
            proxyInstance.on('error', (err: unknown) => {
              console.log('Proxy error:', err);
            });
            proxyInstance.on('proxyReq', (proxyReq: unknown, req: unknown) => {
              const reqObj = req as { method: string; url: string };
              const proxyReqObj = proxyReq as { path: string };
              console.log('Sending Request:', reqObj.method, reqObj.url);
              console.log('Target URL:', proxyReqObj.path);
            });
            proxyInstance.on('proxyRes', (proxyRes: unknown, req: unknown) => {
              const proxyResObj = proxyRes as { statusCode: number };
              const reqObj = req as { url: string };
              console.log('Received Response:', proxyResObj.statusCode, reqObj.url);
            });
          },
        },
      },
    },
  };
});
