// Verify native controls in an isolated Code OSS profile; never touch personal settings.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { resolveElectronBinary } from '../../../scripts/ui/launch-code.mjs';

const uiRoot = fileURLToPath(new URL('../../../', import.meta.url));
const require = createRequire(resolve(uiRoot, 'packages/obra-ui-storybook/package.json'));
const { _electron } = require('playwright');
const output = resolve(uiRoot, '.tmp/captures/obra-sidebar');
mkdirSync(output, { recursive: true });
const fixture = mkdtempSync(join(tmpdir(), 'obra-sidebar-fixture-'));
mkdirSync(join(fixture, 'documents'));
writeFileSync(join(fixture, 'budget.txt'), 'Obra sidebar UI fixture\n');
writeFileSync(join(fixture, 'documents', 'A very long document name for checking native sidebar truncation.txt'), 'Nested document\n');

const report = { status: 'running', checks: [], screenshots: [], errors: [] };
let handle;
let browser;
let page;
try {
  const profile = mkdtempSync(join(tmpdir(), 'obra-sidebar-profile-'));
  handle = { profile, dispose: () => rmSync(profile, { recursive: true, force: true }) };
  const { binaryPath, forkRoot } = resolveElectronBinary();
  browser = await _electron.launch({
    executablePath: binaryPath,
    cwd: forkRoot,
    args: ['.', `--user-data-dir=${profile}`, '--disable-workspace-trust', fixture, '--disable-extensions', '--skip-welcome', '--skip-release-notes'],
    env: { ...process.env, NODE_ENV: 'development', VSCODE_DEV: '1' },
    timeout: 60_000,
  });
  page = await browser.firstWindow();
  await page.bringToFront();
  page.setDefaultTimeout(20_000);
  page.on('pageerror', error => report.errors.push(error.message));
  await page.waitForSelector('.monaco-workbench.obra-sidebar', { timeout: 120_000 });
  // Exercise the actual compiled adapter with disposable service boundaries.
  const lifecycle = await page.evaluate(async () => {
    const moduleUrl = path => new URL(`../../../${path}`, location.href).href;
    const { ObraSidebarContribution } = await import(moduleUrl('workbench/contrib/obraSidebar/browser/obraSidebar.contribution.js'));
    const { Emitter } = await import(moduleUrl('base/common/event.js'));
    const { DisposableStore } = await import(moduleUrl('base/common/lifecycle.js'));
    const changed = new Emitter();
    const added = new Emitter();
    const disposables = new DisposableStore();
    let enabled = true;
    const main = document.createElement('div');
    const auxiliary = document.createElement('div');
    const layout = { containers: [main], onDidAddContainer: added.event };
    const config = { getValue: () => enabled, onDidChangeConfiguration: changed.event };
    const contribution = new ObraSidebarContribution(config, layout);
    const states = [];
    const capture = () => states.push(layout.containers.map(container => container.classList.contains('obra-sidebar')));
    try {
      capture();
      layout.containers.push(auxiliary);
      added.fire({ container: auxiliary, disposables });
      capture();
      enabled = false;
      changed.fire({ affectsConfiguration: key => key === 'obra.sidebar.enabled' });
      capture();
      enabled = true;
      changed.fire({ affectsConfiguration: () => false });
      capture();
      changed.fire({ affectsConfiguration: () => true });
      capture();
      disposables.dispose();
      capture();
      contribution.dispose();
      changed.fire({ affectsConfiguration: () => true });
      capture();
      return states;
    } finally {
      contribution.dispose();
      disposables.dispose();
      changed.dispose();
      added.dispose();
    }
  });
  assert.deepEqual(lifecycle, [[true], [true, true], [false, false], [false, false], [true, true], [true, false], [false, false]]);
  report.checks.push('Compiled adapter: startup, new containers, relevant/unrelated configuration changes, disposal');

  const file = join(output, '01-dark-enabled.png');
  await page.locator('.part.sidebar .monaco-list-row').filter({ hasText: 'budget.txt' }).first().waitFor();
  await page.screenshot({ path: file, timeout: 20_000 });
  report.screenshots.push(file);
  report.checks.push('Real Code OSS startup with default styling and native Explorer fixture');
  report.pending = [
    'Live settings through native configuration service',
    'Theme and Modern UI matrix, native keyboard/menu/resize/drag interactions',
    'Real auxiliary window and human visual review',
  ];
  report.status = 'passed';
} catch (error) {
  report.status = 'failed';
  report.failure = error.stack;
  if (page) await page.screenshot({ path: join(output, 'failure.png'), timeout: 5_000 }).catch(() => {});
  console.error(error);
  process.exitCode = 1;
} finally {
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
  if (browser) await browser.close().catch(() => {});
  if (handle) await handle.dispose();
  rmSync(fixture, { recursive: true, force: true });
  console.log(JSON.stringify(report, null, 2));
}
