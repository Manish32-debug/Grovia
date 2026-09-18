import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Phase 1 tests exercise the middleware chain only, so a syntactically
    // valid DATABASE_URL is enough. Phase 13 swaps this for Testcontainers.
    env: {
      NODE_ENV: 'test',
      LOG_LEVEL: 'silent',
      DATABASE_URL: 'postgresql://grovia:grovia@localhost:5433/grovia_test?schema=public',
      JWT_SECRET: 'test-secret-at-least-thirty-two-characters-long',
    },
  },
});
