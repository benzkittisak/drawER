import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';

const r = (p: string) => fileURLToPath(new URL(p, import.meta.url));

// https://vite.dev / https://vitest.dev
export default defineConfig({
  plugins: [react()],
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
});
