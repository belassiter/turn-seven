import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { plugin as markdown } from 'vite-plugin-markdown';
import path from 'path';

// https://vitest.dev/config/
export default defineConfig({
  plugins: [react(), markdown({ mode: ['react'] })],
  resolve: {
    alias: {
      '@turn-seven/engine': path.resolve(__dirname, './packages/engine/src/index.ts'),
    },
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['packages/**/*.{test,spec}.{js,ts,jsx,tsx}'],
    exclude: ['scripts/**', 'node_modules/**'],
    setupFiles: ['./vitest.setup.ts'],
  },
});
