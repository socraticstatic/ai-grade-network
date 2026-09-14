import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  // Only the Cloud Connect app specs live in e2e/. tests/e2e/ holds INHERITED
  // NetBond/RBAC specs (billing, rbac-*, monitor-*, user-management, …) that
  // exercise legacy routes now redirected to /discover — obsolete, kept as files
  // but out of the default run.
  //
  // testDir is resolved against THIS config's directory, so it is root-anchored
  // by construction: only <configDir>/e2e is walked. Do not go back to
  // testDir: '.' plus floating testIgnore globs like '**/.claude/**' — those
  // match against absolute paths, so a checkout that itself lives under
  // .claude/worktrees/<name>/ ignores every one of its own specs and Playwright
  // exits with "No tests found". Anchoring the walk skips agent worktrees,
  // tests/e2e, node_modules and dist without any ignore patterns at all.
  testDir: './e2e',
  testMatch: ['**/*.spec.ts'],
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  reporter: [['html', { open: 'never' }]],
  use: {
    // Unusual port on purpose — 5173 is the default Vite port and is
    // frequently occupied by another repo's dev server on this machine.
    // Never assume 5173 is this project's server.
    baseURL: 'http://localhost:5199',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    // No auth: the app opens straight onto the product.
    command: 'npm run dev -- --port 5199 --strictPort',
    url: 'http://localhost:5199',
    // Never reuse. The port is fixed, so a dev server left running by ANOTHER
    // checkout of this repo (the main tree on a different branch, a sibling
    // agent worktree) would silently serve the suite that other tree's code —
    // observed live, 30 spurious failures from a stray vite on feat/naas-ai-split.
    // With reuse off, an occupied 5199 fails loudly ("is already used") instead
    // of quietly testing the wrong source. Kill the stray server, don't re-enable.
    reuseExistingServer: false,
    timeout: 60000,
  },
});
