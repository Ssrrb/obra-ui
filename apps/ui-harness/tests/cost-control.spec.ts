import { expect, test, type Page } from '@playwright/test';
import { costDataPayload, SMALL_ROWS } from '../fixtures/data.js';

async function settle(page: Page): Promise<void> {
  await page.evaluate(() => window.__obraHarness.whenSettled());
}
async function load(page: Page, fixture = 'normal'): Promise<void> {
  await page.goto(`/?fixture=${fixture}`);
  await page.waitForFunction(() => Boolean(window.__obraHarness));
  await settle(page);
}
async function analyze(page: Page): Promise<void> {
  await page.getByRole('button', { name: 'Analyze costs', exact: true }).click();
  await settle(page);
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toBeVisible();
}
const rows = (page: Page) => page.locator('#cc-table tbody tr');

test('navigation switches actual project data and budget sections', async ({ page }) => {
  await load(page, 'multiProject');
  await page.locator('#cc-project select').selectOption('borealis');
  await settle(page);
  await expect(rows(page)).toHaveCount(12);
  await expect(page.locator('#cc-status')).toContainText('Borealis');
  await page.getByRole('tab', { name: 'Budget summary' }).click();
  await expect(page.locator('#cc-summary')).toBeVisible();
  await expect(page.locator('#cc-summary')).toContainText('Borealis Platform');
  await page.getByRole('tab', { name: 'Line items' }).click();
  await expect(rows(page)).toHaveCount(12);
});

test('filters distinguish no matches, preserve input focus/caret and clear', async ({ page }) => {
  await load(page);
  const search = page.locator('#cc-search input');
  await search.fill('not-a-cost');
  await expect(page.locator('#cc-result-count')).toHaveText('Showing 0 of 8 cost lines.');
  await expect(page.locator('#cc-table')).toContainText('No cost lines match');
  await expect(search).toBeFocused();
  expect(await search.evaluate((input: HTMLInputElement) => input.selectionStart)).toBe(10);
  await page.getByRole('button', { name: 'Clear filters' }).click();
  await expect(rows(page)).toHaveCount(8);
  await expect(search).toBeFocused();
  await page.locator('#cc-filter-category select').selectOption('Compute');
  await expect(rows(page)).toHaveCount(2);
  await page.locator('#cc-filter-status select').selectOption('approved');
  await expect(rows(page)).toHaveCount(1);
});

test('keyboard navigation activates details and tab navigation without runtime errors', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', (error) => errors.push(error.message));
  await load(page);
  await rows(page).nth(0).click();
  await page.keyboard.press('ArrowDown');
  await expect(page.locator('#cc-detail')).toContainText('cc-0002');
  await page.keyboard.press('Enter');
  await expect(page.locator('#cc-detail')).toBeFocused();
  await page.getByRole('tab', { name: 'Line items' }).focus();
  await page.keyboard.press('ArrowRight');
  await expect(page.getByRole('tab', { name: 'Budget summary' })).toHaveAttribute('aria-selected', 'true');
  expect(errors).toEqual([]);
});

test('add form validates, focuses error, saves decimal amount and restores focus', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await expect(page.locator('#cc-add-name input')).toBeFocused();
  await page.locator('#cc-add-cost input').focus();
  await page.locator('obra-form-field').filter({ has: page.locator('#cc-add-name') }).locator('label').click();
  await expect(page.locator('#cc-add-name input')).toBeFocused();
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(page.locator('#cc-add-name input')).toBeFocused();
  await expect(page.locator('#cc-add-name')).toHaveAttribute('invalid', '');
  await expect(page.locator('#cc-add-name input')).toHaveAttribute('aria-description', 'Enter a name for the cost line.');
  await page.locator('#cc-add-name input').fill('Vendor renewal');
  await page.locator('#cc-add-cost input').fill('-10');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await expect(page.locator('#cc-add-cost input')).toBeFocused();
  await page.locator('#cc-add-cost input').fill('1,250.40');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await settle(page);
  await expect(rows(page)).toHaveCount(9);
  await expect(page.locator('#cc-table')).toContainText('USD 1,250.40');
  await expect(page.locator('#cc-add [part="control"]')).toBeFocused();
});

test('empty project supports adding its first item; errors recover through retry', async ({ page }) => {
  await load(page, 'empty');
  await expect(page.locator('.obra-cost-control')).toHaveAttribute('data-state', 'empty');
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await page.locator('#cc-add-name input').fill('First invoice');
  await page.locator('#cc-add-cost input').fill('50');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await settle(page);
  await expect(rows(page)).toHaveCount(1);
  await load(page, 'error');
  await page.locator('#cc-table').getByRole('button', { name: 'Retry', exact: true }).click();
  await settle(page);
  await expect(rows(page)).toHaveCount(8);
});

test('editing saves only on acknowledgment and Escape cancels with focus restored', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Edit item' }).click();
  await page.locator('#cc-edit-cost input').fill('99.50');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await settle(page);
  await expect(page.locator('#cc-detail')).toContainText('USD 99.50');
  await page.getByRole('button', { name: 'Edit item' }).click();
  await page.locator('#cc-edit-cost input').fill('1');
  await page.keyboard.press('Escape');
  await expect(page.locator('#cc-detail')).toContainText('USD 99.50');
  await expect(page.locator('#cc-edit [part="control"]')).toBeFocused();
});

test('dirty item and add drafts require explicit discard before switching project', async ({ page }) => {
  await load(page, 'multiProject');
  await rows(page).first().click();
  await page.getByRole('button', { name: 'Edit item' }).click();
  await page.locator('#cc-edit-name input').fill('Unsaved name');
  await page.locator('#cc-project select').selectOption('borealis');
  await expect(page.getByRole('alertdialog')).toBeVisible();
  await page.locator('#cc-confirm').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#cc-project select')).toHaveValue('aurora');
  await expect(page.locator('#cc-edit-name input')).toHaveValue('Unsaved name');
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await page.locator('#cc-add-name input').fill('Unsaved invoice');
  await page.locator('#cc-project select').selectOption('borealis');
  await page.getByRole('button', { name: 'Discard and switch', exact: true }).click();
  await settle(page);
  await expect(rows(page)).toHaveCount(12);
  await expect(page.locator('#cc-add-form')).toBeHidden();
});

test('read-only and permission-denied states do not offer changing actions or false retry', async ({ page }) => {
  await load(page, 'readOnly');
  await expect(page.locator('#cc-add [part="control"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.locator('#cc-analyze [part="control"]')).toHaveAttribute('aria-disabled', 'true');
  await expect(page.getByRole('button', { name: 'Edit item' })).toHaveCount(0);
  await expect(page.locator('#cc-banner')).toContainText('Read-only');
  await load(page, 'permissionDenied');
  await expect(page.getByRole('button', { name: 'Retry', exact: true })).toHaveCount(0);
  await expect(page.locator('#cc-banner')).toContainText('Access denied');
});

test('AI reject and pending cancel leave costs unchanged and ignore delayed proposals', async ({ page }) => {
  await load(page);
  await analyze(page);
  await page.getByRole('button', { name: 'Reject', exact: true }).click();
  await expect(page.locator('#cc-status')).toContainText('costs unchanged');
  await page.getByRole('button', { name: 'Analyze costs', exact: true }).click();
  await page.locator('#cc-cancel-analysis').getByRole('button').click();
  await settle(page);
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__obraHarness.outbound().filter((entry: any) => entry.type === 'cost-control/apply-analysis').length)).toBe(0);
});

test('AI accept requires confirmation, changes only acknowledged item and keeps budget fixed', async ({ page }) => {
  await load(page);
  await analyze(page);
  await page.getByRole('button', { name: 'Accept suggestion' }).click();
  expect(await page.evaluate(() => window.__obraHarness.outbound().filter((entry: any) => entry.type === 'cost-control/apply-analysis').length)).toBe(0);
  await page.getByRole('button', { name: 'Apply change', exact: true }).click();
  await settle(page);
  await expect(page.locator('#cc-status')).toContainText('Suggestion applied');
  await page.getByRole('tab', { name: 'Line items' }).click();
  await expect(rows(page).last()).toContainText('USD 322.15');
  await page.getByRole('tab', { name: 'Budget summary' }).click();
  await expect(page.locator('#cc-summary')).toContainText('USD 1,939.15 of USD 3,992');
});

test('AI error can retry; old project responses and malformed data cannot change costs', async ({ page }) => {
  await load(page, 'multiProject');
  await page.getByRole('button', { name: 'Analyze costs', exact: true }).click();
  const requestId = await page.evaluate(() => (window.__obraHarness.outbound().at(-1) as any).payload.requestId);
  await page.evaluate((id) => window.__obraHarness.injectHostMessage({ type: 'cost-control/analysis-error', requestId: id, payload: { message: 'Mock analysis unavailable. Retry.' } }), requestId);
  await expect(page.getByRole('button', { name: 'Retry analysis' })).toBeVisible();
  await page.getByRole('button', { name: 'Retry analysis' }).click();
  await settle(page);
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toBeVisible();
  await page.locator('#cc-project select').selectOption('borealis');
  await settle(page);
  await page.evaluate((payload) => {
    window.__obraHarness.injectHostMessage({ type: 'cost-control/data', requestId: 'cc-req-1', payload });
    window.__obraHarness.injectHostMessage({ type: 'cost-control/data', payload: { rows: 'invalid' } });
  }, costDataPayload(SMALL_ROWS));
  await page.getByRole('tab', { name: 'Line items' }).click();
  await expect(rows(page)).toHaveCount(12);
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toHaveCount(0);
});

test('reset cleans delayed responders and returns fresh world data', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Analyze costs', exact: true }).click();
  await page.evaluate(() => window.__obraHarness.reset());
  await settle(page);
  await expect(rows(page)).toHaveCount(8);
  await expect(page.getByRole('button', { name: 'Accept suggestion' })).toHaveCount(0);
  expect(await page.evaluate(() => window.__obraHarness.outbound())).toEqual([{ type: 'cost-control/ready' }]);
});

for (const [fixture, count] of [['oneRow', 1], ['largeDataset', 1000], ['longValues', 3]] as const) {
  test(`extreme fixture ${fixture} renders ${count} rows without script errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (error) => errors.push(error.message));
    await load(page, fixture);
    await expect(rows(page)).toHaveCount(count);
    await rows(page).first().click();
    await expect(page.locator('#cc-detail')).toBeVisible();
    expect(errors).toEqual([]);
  });
}

test('320px reflow keeps document within viewport and controls reachable', async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 800 });
  await load(page);
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(320);
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await expect(page.locator('#cc-add-name input')).toBeFocused();
  await page.locator('#cc-add-name input').fill('Narrow invoice');
  await page.locator('#cc-add-cost input').fill('10');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  await settle(page);
  await expect(rows(page)).toHaveCount(9);
});

test('pending save requires matching acknowledgment and host rejection preserves entered values', async ({ page }) => {
  await load(page, 'oneRow'); // intentionally has no automatic responder
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await page.locator('#cc-add-name input').fill('Acknowledged invoice');
  await page.locator('#cc-add-cost input').fill('25');
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  const requestId = await page.evaluate(() => (window.__obraHarness.outbound().at(-1) as any).payload.requestId);
  await expect(page.locator('#cc-add-name input')).toBeDisabled();
  await page.evaluate((payload) => window.__obraHarness.injectHostMessage({ type: 'cost-control/data', payload }), costDataPayload(SMALL_ROWS));
  await expect(rows(page)).toHaveCount(1); // unsolicited data cannot acknowledge a save
  await page.evaluate((id) => window.__obraHarness.injectHostMessage({ type: 'cost-control/error', requestId: id, payload: { message: 'Mock host rejected the invoice. Correct and retry.' } }), requestId);
  await expect(page.locator('#cc-add-error')).toContainText('rejected');
  await expect(page.locator('#cc-add-name input')).toHaveValue('Acknowledged invoice');
  await expect(page.locator('#cc-add-name input')).toBeEnabled();
  await page.getByRole('button', { name: 'Save item', exact: true }).click();
  const retryId = await page.evaluate(() => (window.__obraHarness.outbound().at(-1) as any).payload.requestId);
  await page.evaluate(({ id, payload }) => window.__obraHarness.injectHostMessage({ type: 'cost-control/data', requestId: id, payload }), { id: retryId, payload: costDataPayload(SMALL_ROWS) });
  await expect(page.locator('#cc-add-form')).toBeHidden();
  await expect(rows(page)).toHaveCount(8);
});

test('dirty row selection cancellation preserves edit and previous table highlight', async ({ page }) => {
  await load(page);
  await page.getByRole('button', { name: 'Edit item' }).click();
  await page.locator('#cc-edit-cost input').fill('77');
  await rows(page).first().click();
  await page.locator('#cc-confirm').getByRole('button', { name: 'Cancel', exact: true }).click();
  await expect(page.locator('#cc-edit-cost input')).toHaveValue('77');
  await expect(rows(page).nth(3)).toHaveAttribute('aria-selected', 'true');
  await rows(page).first().click();
  await page.getByRole('button', { name: 'Discard changes', exact: true }).click();
  await expect(page.locator('#cc-detail')).toContainText('cc-0001');
  await expect(page.locator('#cc-edit-cost input')).toHaveCount(0);
});

test('forced-colors and RTL keep primary interactions and visible focus functional', async ({ page }) => {
  await page.emulateMedia({ forcedColors: 'active' });
  await load(page);
  await page.evaluate(() => { document.documentElement.dir = 'rtl'; });
  await page.getByRole('button', { name: 'Refresh', exact: true }).focus();
  await expect(page.locator('#cc-refresh [part="control"]')).toBeFocused();
  expect(await page.locator('#cc-refresh [part="control"]').evaluate((node) => getComputedStyle(node).outlineStyle)).not.toBe('none');
  await page.keyboard.press('Enter');
  await settle(page);
  await expect(rows(page)).toHaveCount(8);
  await page.getByRole('button', { name: 'Add cost item' }).click();
  await expect(page.locator('#cc-add-name input')).toBeFocused();
});
