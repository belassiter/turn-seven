import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { plugin as markdown } from 'vite-plugin-markdown';
import path from 'path';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), markdown({ mode: ['react'] })],
  resolve: {
    alias: {
      '@turn-seven/engine': path.resolve(__dirname, '../../engine/src/index.ts'),
    },
  },
});
