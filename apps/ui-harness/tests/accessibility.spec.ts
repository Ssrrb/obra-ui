import { expect, test, type Page } from '@playwright/test';
import { createRequire } from 'node:module';
import { fixtures } from '../fixtures/index.js';
import type { AxeResults } from 'axe-core';

const axePath = createRequire(import.meta.url).resolve('axe-core/axe.min.js');
async function audit(page: Page): Promise<void> {
  await page.addScriptTag({ path: axePath });
  const violations = await page.evaluate(async () => {
    const axe = (window as unknown as { axe: { run(options: unknown): Promise<AxeResults> } }).axe;
    const result = await axe.run({ runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21aa'] } });
    return result.violations.map(({ id, impact, nodes }) => ({ id, impact, targets: nodes.map(({ target }) => target) }));
  });
  expect(violations).toEqual([]);
}
async function load(page: Page, fixture: string): Promise<void> {
  await page.goto(`/?fixture=${fixture}`);
  await page.waitForFunction(() => Boolean(window.__obraHarness));
  await page.evaluate(() => window.__obraHarness.whenSettled());
}
for (const fixture of Object.keys(fixtures)) {
  test(`automated accessibility: ${fixture}`, async ({ page }) => {
    await load(page, fixture);
    await audit(page);
  });
}
for (const pane of ['Budget summary', 'AI review', 'Add cost item', 'Edit item']) {
  test(`automated accessibility: ${pane}`, async ({ page }) => {
    await load(page, 'normal');
    if (pane === 'Budget summary' || pane === 'AI review') await page.getByRole('tab', { name: pane }).click();
    else await page.getByRole('button', { name: pane, exact: true }).click();
    if (pane === 'AI review') {
      await page.getByRole('button', { name: 'Analyze costs', exact: true }).click();
      await page.evaluate(() => window.__obraHarness.whenSettled());
      await audit(page);
      await page.getByRole('button', { name: 'Accept suggestion' }).click();
    }
    await audit(page);
  });
}
