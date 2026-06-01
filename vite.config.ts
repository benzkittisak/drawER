import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// https://vite.dev / https://vitest.dev
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  // Docker dev: SYNC_PROXY_TARGET=http://sync:1234 on the web service.
  // Host dev: defaults to http://127.0.0.1:1234
  const syncProxy = env.SYNC_PROXY_TARGET || 'http://127.0.0.1:1234';

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 5173,
      headers: {
        'Content-Security-Policy': 'frame-ancestors *',
      },
      proxy: {
        '/api': { target: syncProxy, changeOrigin: true },
      },
    },
    resolve: {
      alias: {
        '@core': r('./src/core'),
        '@collab': r('./src/collab'),
        '@store': r('./src/store'),
        '@canvas': r('./src/canvas'),
        '@views': r('./src/views'),
        '@ui': r('./src/ui'),
        '@data': r('./src/data'),
      },
    },
    test: {
      environment: 'jsdom',
      globals: true,
      include: ['src/**/*.{test,spec}.{ts,tsx}'],
      passWithNoTests: true,
    },
  };
});
