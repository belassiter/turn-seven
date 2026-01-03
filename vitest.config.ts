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
    env: {
      VITE_FIREBASE_API_KEY: 'test-api-key',
      VITE_FIREBASE_AUTH_DOMAIN: 'test-auth-domain',
      VITE_FIREBASE_PROJECT_ID: 'turn-seven',
      VITE_FIREBASE_STORAGE_BUCKET: 'test-storage-bucket',
      VITE_FIREBASE_MESSAGING_SENDER_ID: 'test-messaging-sender-id',
      VITE_FIREBASE_APP_ID: 'test-app-id',
      VITE_FIREBASE_MEASUREMENT_ID: 'test-measurement-id',
    },
  },
});
