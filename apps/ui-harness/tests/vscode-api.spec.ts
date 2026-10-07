/**
 * Behavior of the acquireVsCodeApi mock, asserted through the same handle the
 * visual tests use. These are functional (not screenshot) checks: they prove
 * the bridge a production webview relies on is faithfully mocked.
 */
import { expect, test } from '@playwright/test';

test('the mock records outbound messages and delivers host injections', async ({ page }) => {
  await page.goto('/?fixture=normal');
  await page.evaluate(() => window.__obraHarness.whenSettled());

  // The surface announced itself through postMessage on mount.
  const outbound = await page.evaluate(() =>
    (window.__obraHarness.outbound() as ReadonlyArray<{ type: string }>).map((message) => message.type),
  );
  expect(outbound).toContain('cost-control/ready');

  // An injected host message reaches the surface through window's `message`
  // event — the same channel the real host uses.
  await page.evaluate(() =>
    window.__obraHarness.injectHostMessage({
      type: 'cost-control/error',
      payload: { message: 'Injected by the harness test.' },
    }),
  );
  await expect(page.locator('.obra-cost-control')).toHaveAttribute('data-state', 'error');
});

test('getState rehydrates the fixture selection and setState persists changes', async ({ page }) => {
  await page.goto('/?fixture=normal');
  await page.evaluate(() => window.__obraHarness.whenSettled());

  // The normal fixture persists selectedId 'cc-0004'; the detail pane shows it.
  await expect(page.locator('obra-property-row[label="ID"]')).toHaveAttribute('value', 'cc-0004');

  // Selecting another row updates persisted state through setState.
  await page.locator('.obra-cost-control__master tr[data-index="0"]').click();
  await expect(page.locator('obra-property-row[label="ID"]')).toHaveAttribute('value', 'cc-0001');
  const state = (await page.evaluate(() => window.__obraHarness.state())) as { selectedId: string };
  expect(state.selectedId).toBe('cc-0001');

  // Reset re-runs the fixture from its initial state, deterministically.
  await page.evaluate(() => window.__obraHarness.reset());
  await page.evaluate(() => window.__obraHarness.whenSettled());
  await expect(page.locator('obra-property-row[label="ID"]')).toHaveAttribute('value', 'cc-0004');
  const outbound = await page.evaluate(() =>
    (window.__obraHarness.outbound() as ReadonlyArray<{ type: string }>).map((message) => message.type),
  );
  expect(outbound).toEqual(['cost-control/ready']);
});
