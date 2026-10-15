import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';

export default defineConfig({
  test: {
    // Milestone 1 tests are pure logic (money, permissions, validation, env),
    // so a Node environment is correct. Component tests will add jsdom and
    // Testing Library in a later milestone, when there are components to test.
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    // Never let a test reach a real provider.
    testTimeout: 10_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
});
