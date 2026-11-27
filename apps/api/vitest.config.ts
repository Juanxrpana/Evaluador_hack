import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fileParallelism: false,
    testTimeout: 30_000,
    env: {
      DATABASE_URL: 'postgresql://unused',
      BETTER_AUTH_SECRET: 'test-only-secret-0123456789abcdef0123456789abcdef',
      BETTER_AUTH_URL: 'http://localhost:3000',
      LOG_LEVEL: 'silent',
    },
  },
});
