import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    // Unit tests live in tests/; e2e/ is Playwright's and must not run under vitest.
    include: ['tests/**/*.test.ts'],
  },
});
