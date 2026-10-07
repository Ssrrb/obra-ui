import { defineConfig } from '@playwright/test';

/**
 * Visual regression for the webview harness: Chromium only.
 *
 * The harness is fast feedback, not the merge gate — important workflows must
 * still run in the real Code OSS fork (`pnpm ui:e2e`, design/PRINCIPLES.md
 * rule 10). Baselines recorded here are approved by a design reviewer, never by
 * the implementer (rule 9); see README.md for the exact commands.
 *
 * Determinism, in one place:
 * - fixtures never read a clock, `Math.random()`, or the network;
 * - `reducedMotion: 'reduce'` + `animations: 'disabled'` freeze spinners, so the
 *   `loading` and `slow` fixtures do not depend on when the frame was captured;
 * - `locale`/`timezoneId` are pinned so no browser default can leak into text;
 * - tests wait for `window.__obraHarness.whenSettled()` (the fixture's host
 *   script has been delivered *and* dispatched) plus a `data-state` assertion
 *   instead of sleeping a fixed number of milliseconds.
 */
const port = Number(process.env.OBRA_HARNESS_PORT ?? 5173);
const baseURL = `http://127.0.0.1:${port}`;

export default defineConfig({
  testDir: './tests',
  // Pure logic tests (tests/logic/*.test.ts) run under `node --test` after a
  // tsc compile — Playwright must not collect them.
  testIgnore: ['**/logic/**'],
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  outputDir: './test-results',

  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'off',
  },

  expect: {
    toHaveScreenshot: {
      animations: 'disabled',
      caret: 'initial',
      // Per-pixel colour tolerance for antialiasing; no tolerance for layout
      // drift — a moved component must fail.
      threshold: 0.1,
      maxDiffPixelRatio: 0,
    },
  },

  // One project: the harness proves webview rendering in Chromium. The real
  // host has its own harness (scripts/ui) and its own captures.
  projects: [
    {
      name: 'chromium',
      use: {
        browserName: 'chromium',
        headless: true,
        viewport: { width: 1280, height: 800 },
        deviceScaleFactor: 1,
        isMobile: false,
        hasTouch: false,
        colorScheme: 'dark',
        reducedMotion: 'reduce',
        locale: 'en-US',
        timezoneId: 'UTC',
      },
    },
  ],

  // Baselines live next to the specs so a reviewer can read them in the diff.
  // They are committed only after design-review approval (README.md).
  snapshotPathTemplate: '{testDir}/__screenshots__/{projectName}/{arg}{ext}',

  webServer: {
    command: `./node_modules/.bin/vite --host 127.0.0.1 --port ${port}`,
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
});
