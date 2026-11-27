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
      // AI routes are never exercised by these suites; the key only satisfies
      // the fail-fast environment parse.
      OPENROUTER_API_KEY: 'test-only-openrouter-key',
      EMBEDDING_CACHE_DIR: '.models-test',
      // Keep the upload-size guard testable without huge payloads.
      DOCUMENT_MAX_BYTES: '1024',
    },
  },
});
