import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // e2e/ holds Playwright specs (a different test runner, real-browser
    // only) - vitest's default glob would otherwise pick them up too.
    exclude: ['**/node_modules/**', '**/dist/**', 'e2e/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        '*.config.js',
        '*.test.js'
      ]
    },
    testTimeout: 10000,
    hookTimeout: 10000
  }
});