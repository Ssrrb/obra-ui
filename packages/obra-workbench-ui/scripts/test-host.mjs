// Real native UI, ordinary code.sh discovery, disposable profile only.
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const uiRoot = fileURLToPath(new URL('../../../', import.meta.url));
const fork = resolve(uiRoot, '../vscode');
const require = createRequire(resolve(uiRoot, 'packages/obra-ui-storybook/package.json'));
const { chromium } = require('playwright');
const output = resolve(uiRoot, '.tmp/captures/obra-sidebar');
mkdirSync(output, { recursive: true });
const profile = mkdtempSync(join(tmpdir(), 'obra-sidebar-native-'));
mkdirSync(join(profile, 'User'));
let settings = { 'workbench.colorTheme': 'Default Dark Modern', 'workbench.startupEditor': 'none', 'window.dialogStyle': 'custom', 'workbench.experimental.modernUI': false };
const update = values => { settings = { ...settings, ...values }; writeFileSync(join(profile, 'User/settings.json'), JSON.stringify(settings)); };
update({});
const report = { status: 'running', launch: 'scripts/code.sh; no extensionDevelopmentPath', checks: [], screenshots: [], errors: [] };
let browser, page;
const proc = spawn('/bin/bash', ['scripts/code.sh', '--user-data-dir', profile, '--remote-debugging-port=0', '--skip-welcome', '--skip-release-notes', '--disable-workspace-trust', '--locale=es', '--new-window'], { cwd: fork, env: { ...process.env, VSCODE_SKIP_PRELAUNCH: '1' }, stdio: ['ignore', 'pipe', 'pipe'] });
let logs = '';
proc.stdout.on('data', data => { logs += data; }); proc.stderr.on('data', data => { logs += data; });
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
try {
  let port;
  for (let i = 0; i < 180; i++) {
    try { port = Number(readFileSync(join(profile, 'DevToolsActivePort'), 'utf8').split('\n')[0]); break; } catch {}
    if (proc.exitCode !== null) throw new Error(`code.sh exited ${proc.exitCode}\n${logs}`);
    await delay(500);
  }
  assert.ok(port, `No CDP port\n${logs}`);
  browser = await chromium.connectOverCDP(`http://127.0.0.1:${port}`);
  const context = browser.contexts()[0];
  for (let i = 0; i < 60 && !page; i++) {
    page = context.pages().filter(p => p.url().includes('workbench')).at(-1);
    if (!page) await delay(500);
  }
  assert.ok(page, 'Native workbench window');
  page.setDefaultTimeout(20000);
  await page.bringToFront();
  page.on('pageerror', error => report.errors.push(error.message));
  const icon = key => page.locator(`.part.activitybar .action-label.codicon-${key}`);
  await icon('project').waitFor({ timeout: 60000 });
  for (const key of ['project', 'inbox', 'graph', 'organization', 'files']) assert.ok(await icon(key).count(), key);
  report.checks.push('Ordinary code.sh discovers built-in extension and all five activity icons');
  const capture = async name => { const path = join(output, name + '.png'); await page.screenshot({ path }); report.screenshots.push(path); };
  const command = async text => {
    await page.keyboard.press('Escape');
    await page.keyboard.press('F1');
    const input = page.locator('.quick-input-widget input');
    await input.waitFor({ state: 'visible' });
    await input.fill('>' + text);
    await page.locator('.quick-input-list .monaco-list-row').filter({ hasText: text }).first().waitFor();
    await page.keyboard.press('Enter');
    await input.waitFor({ state: 'hidden' });
  };
  const sidebar = page.locator('.part.sidebar');
  await sidebar.getByText('No hay proyectos abiertos.', { exact: false }).waitFor();
  await capture('01-dark-empty');
  for (const [key, text] of [['inbox', 'La bandeja está vacía.'], ['graph', 'No hay movimientos de caja.'], ['organization', 'No hay cuentas conectadas.'], ['files', 'Sin proyecto abierto.']]) {
    await icon(key).last().click(); await sidebar.getByText(text, { exact: false }).waitFor();
  }
  report.checks.push('Five native empty states; first activation opens Projects');
  await command('Obra: Mostrar proyecto de ejemplo');
  await sidebar.getByText('Edificio Las Palmeras', { exact: true }).waitFor();
  await sidebar.getByText('Presupuesto', { exact: true }).click();
  await page.locator('.monaco-editor').filter({ hasText: 'Read-only preview' }).waitFor();
  const before = await page.locator('.monaco-editor .view-lines').first().innerText();
  await page.locator('.monaco-editor textarea').first().focus();
  await page.keyboard.type('SHOULD_NOT_EDIT');
  assert.equal(await page.locator('.monaco-editor .view-lines').first().innerText(), before);
  await page.keyboard.press('Escape');
  report.checks.push('Preview command; native text document rejects edits');
  await sidebar.locator('.monaco-list').first().focus();
  await page.keyboard.press('Home');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('ArrowLeft');
  await sidebar.getByText('Demoliciones', { exact: true }).waitFor({ state: 'hidden' });
  await page.keyboard.press('ArrowRight');
  await sidebar.getByText('Demoliciones', { exact: true }).waitFor();
  await page.keyboard.press('ArrowDown');
  report.checks.push('Native tree expansion and arrow-key navigation');
  for (const [name, theme] of [['02-dark-preview', 'Default Dark Modern'], ['03-light-preview', 'Default Light Modern'], ['04-hc-dark-preview', 'Default High Contrast'], ['05-hc-light-preview', 'Default High Contrast Light']]) {
    update({ 'workbench.colorTheme': theme });
    const themeClass = { 'Default Dark Modern': 'vs-dark', 'Default Light Modern': 'vs', 'Default High Contrast': 'hc-black', 'Default High Contrast Light': 'hc-light' }[theme];
    await page.locator(`.monaco-workbench.${themeClass}`).waitFor();
    await capture(name);
  }
  update({ 'workbench.experimental.modernUI': true });
  await page.locator('.monaco-workbench.modern-ui').waitFor();
  await capture('06-modern-ui');
  report.checks.push('Dark, light, both high-contrast themes and Modern UI captures');
  await command('Obra: Salir de vista previa');
  await sidebar.getByText('Sin proyecto abierto.', { exact: false }).waitFor();
  await command('Obra: Mostrar proyecto de ejemplo');
  await icon('inbox').click();
  await command('Developer: Reload Window');
  await icon('project').waitFor();
  await sidebar.getByText('La bandeja está vacía.', { exact: false }).waitFor();
  await icon('files').last().click();
  await sidebar.getByText('Sin proyecto abierto.', { exact: false }).waitFor();
  report.checks.push('Exit command and reload reset preview; reload preserves selected Inbox');
  await command('Obra: Mostrar proyecto de ejemplo');
  update({ 'obra.sidebar.enabled': false });
  for (const key of ['project', 'inbox', 'graph', 'organization']) await icon(key).waitFor({ state: 'hidden' });
  await page.locator('.part.activitybar [aria-label^="Explorador de Obra"]').waitFor({ state: 'hidden' });
  update({ 'obra.sidebar.enabled': true });
  await icon('project').waitFor(); await icon('project').click();
  await sidebar.getByText('No hay proyectos abiertos.', { exact: false }).waitFor();
  report.checks.push('Live native configuration off/on hides containers and resets preview');
  await command('View: Show Explorer');
  await sidebar.locator('.explorer-viewlet').waitFor();
  report.checks.push('Upstream native Explorer remains available');
  report.status = 'passed';
} catch (error) {
  report.status = 'failed'; report.failure = error.stack; process.exitCode = 1; console.error(error);
  if (page) await page.screenshot({ path: join(output, 'failure.png') }).catch(() => {});
} finally {
  writeFileSync(join(output, 'report.json'), JSON.stringify(report, null, 2));
  writeFileSync(join(output, 'host.log'), logs);
  if (browser) {
    const session = await browser.newBrowserCDPSession().catch(() => undefined);
    if (session) await Promise.race([session.send('Browser.close').catch(() => {}), delay(2000)]);
    await Promise.race([browser.close().catch(() => {}), delay(2000)]);
  }
  proc.kill('SIGTERM');
  await delay(1000);
  if (proc.exitCode === null) proc.kill('SIGKILL');
  rmSync(profile, { recursive: true, force: true });
  console.log(JSON.stringify(report, null, 2));
}
