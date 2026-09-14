import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test/setup.ts',
    // Only run tests in the shipped app. src_old/ is a legacy snapshot,
    // .claude/worktrees/ holds other agents' checkouts (scanning them OOMs
    // the runner), and e2e/**, tests/e2e/** are Playwright specs (they
    // import @playwright/test, not vitest, and are run via `npm run test:e2e`).
    exclude: [
      'node_modules/**',
      'dist/**',
      'src_old/**',
      '**/src_old/**',
      '.claude/**',
      'e2e/**',
      'e2e-auth/**',
      'tests/e2e/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'src/test/',
        '**/*.d.ts',
        '**/*.test.{ts,tsx}',
        '**/*.spec.{ts,tsx}'
      ]
    }
  }
});