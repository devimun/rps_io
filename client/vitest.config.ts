import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['src/**/*.{test,spec}.ts', 'src/**/*.{test,spec}.tsx'],
  },
  resolve: {
    alias: {
      '@chaos-rps/shared': path.resolve(__dirname, '../shared/src'),
    },
  },
});
