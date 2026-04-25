import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    exclude: ['node_modules', 'src-old'],
    hookTimeout: 60000,
    testTimeout: 60000,
  },
  resolve: {
    alias: {
      '@dist': path.resolve(__dirname, './dist/esm'),
    },
  },
});
