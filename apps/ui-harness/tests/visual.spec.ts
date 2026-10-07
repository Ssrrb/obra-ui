/**
 * Visual regression: iterate every fixture, diff against the committed
 * baseline. Chromium only (playwright.config.ts).
 *
 * Stabilization without sleeping: each test awaits
 * `window.__obraHarness.whenSettled()`, which resolves only after every
 * scheduled fixture message — the delayed `slow` one included — has been
 * dispatched, plus two animation frames. Combined with
 * `reducedMotion: 'reduce'` and `animations: 'disabled'` from the config, the
 * captured frame is a pure function of the fixture.
 *
 * Baselines are recorded with `playwright test --update-snapshots` and are
 * approved by a design reviewer, never by the implementer (Principle 9).
 * Commands: see README.md.
 */
import { expect, test } from '@playwright/test';

/** fixture id -> the data-state the surface must settle into. */
const CASES = [
  { fixture: 'normal', state: 'ready' },
  { fixture: 'loading', state: 'loading' },
  { fixture: 'empty', state: 'empty' },
  { fixture: 'error', state: 'error' },
  // slow ends in `ready`: whenSettled() waits out the delayed data message.
  { fixture: 'slow', state: 'ready' },
  { fixture: 'permissionDenied', state: 'permission-denied' },
  { fixture: 'largeDataset', state: 'ready' },
] as const;

for (const { fixture, state } of CASES) {
  test(`cost-control matches the ${fixture} baseline`, async ({ page }) => {
    await page.goto(`/?fixture=${fixture}`);
    await page.evaluate(() => window.__obraHarness.whenSettled());

    const surface = page.locator('.obra-cost-control');
    await expect(surface).toHaveAttribute('data-state', state);
    await expect(surface).toHaveScreenshot(`cost-control-${fixture}.png`);
  });
}

test('an unknown fixture renders a harness error and never falls back', async ({ page }) => {
  await page.goto('/?fixture=no-such-fixture');

  const root = page.locator('#harness-root');
  await expect(root).toHaveAttribute('data-state', 'harness-error');
  await expect(root.locator('obra-error-state')).toContainText('Unknown fixture');
  // No surface was mounted as a silent substitute.
  await expect(page.locator('.obra-cost-control')).toHaveCount(0);
});
