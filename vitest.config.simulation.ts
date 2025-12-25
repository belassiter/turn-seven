// vitest.config.simulation.ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { plugin as markdown } from 'vite-plugin-markdown';
import path from 'path';

// This is a standalone configuration for the simulation.
// It copies settings from the base config but does NOT merge the 'include' array.
export default defineConfig({
  plugins: [react(), markdown({ mode: ['react'] })],
  resolve: {
    alias: {
      '@turn-seven/engine': path.resolve(__dirname, './packages/engine/src/index.ts'),
    },
  },
  test: {
    // These settings are copied from the base config
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    // This is the key change: it ONLY includes the simulation script.
    include: ['scripts/monte-carlo.test.tsx'],
    // Give the simulation a long default timeout
    testTimeout: 5 * 60 * 1000, // 5 minutes
  },
});