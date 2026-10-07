/**
 * Flow: cost-control
 *
 * Goal: exercise the Obra Studio cost-control screen inside the real Code OSS
 * fork — open the fixture project, invoke the cost-control product command,
 * land on the target screen, interact, and capture.
 *
 * HONEST STATUS: the Obra Studio extension (and therefore the cost-control
 * command/screen) is NOT implemented in the real fork yet. This flow performs
 * the generic parts it can perform honestly (fixture workspace open, quick
 * input, command search evidence) and then fails with status
 * "not-implemented" (exit code 2) once it confirms the command is not
 * registered. It never substitutes an unrelated screen or fakes a pass.
 */

export const fixture = '../fixtures/cost-control';

/** The product command the cost-control screen will eventually be bound to. */
const EXPECTED_COMMAND_LABEL = 'Cost Control';

export async function run(ctx) {
  ctx.log('flow start: cost-control');

  // Step 1: workbench is up; record it.
  await ctx.capture('01-workbench-opened');

  // Step 2: the fixture project must actually be open (not the fork sources).
  const title = await ctx.page.title();
  if (!title.toLowerCase().includes('cost-control')) {
    throw new Error(
      `Expected the fixture project to be open (window title should mention "cost-control"), got: "${title}"`,
    );
  }
  ctx.log(`fixture workspace open: ${title}`);
  await ctx.capture('02-fixture-open');

  // Step 3: open the command palette and search for the product command.
  await ctx.page.keyboard.press('ControlOrMeta+Shift+P');
  await ctx.page.waitForSelector('.quick-input-widget', { timeout: 15_000 });
  await ctx.page.keyboard.type(EXPECTED_COMMAND_LABEL);
  await ctx.page.waitForTimeout(500); // let the fuzzy filter settle
  await ctx.capture('03-command-search');

  // Step 4: check whether the command exists in the real host.
  const rows = await ctx.page.$$('.quick-input-list .monaco-list-row');
  if (rows.length === 0) {
    // Honest failure: the product command/screen is not implemented in the
    // real fork. This is a documented limitation, not a passing test.
    throw new Error(
      `NOT IMPLEMENTED IN HOST: no command matching "${EXPECTED_COMMAND_LABEL}" is registered in the real Code OSS fork. ` +
      'The Obra Studio extension (cost-control command and screen) has not been built yet. ' +
      'Screenshots 01-03 record the environment evidence; run this flow again after the product command ships.',
    );
  }

  // Step 5 (future path, once the command exists): invoke it.
  await rows[0].click();
  await ctx.page.waitForTimeout(1_000);
  await ctx.capture('04-command-executed');

  // Step 6 (future path): the target screen must actually appear.
  const targetScreen = await ctx.page.waitForSelector('.webview, .obra-cost-control', { timeout: 10_000 })
    .catch(() => null);
  if (!targetScreen) {
    throw new Error(
      'Command executed but no target screen (webview or obra-cost-control surface) appeared. ' +
      'Do not treat this as a pass; the cost-control screen is not rendered in the real host.',
    );
  }
  await ctx.capture('05-target-screen');
  ctx.log('flow complete: cost-control');
}
