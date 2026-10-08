import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { emitExtension } from '../scripts/build.mjs';
const manifest = JSON.parse(readFileSync(new URL('../src/package.json', import.meta.url)));
test('five native containers and setting-gated trees', () => {
  assert.deepEqual(manifest.contributes.viewsContainers.activitybar.map(v => [v.id, v.icon]), [['obra-projects', '$(project)'], ['obra-inbox', '$(inbox)'], ['obra-cashflow', '$(graph)'], ['obra-accounts', '$(organization)'], ['obra-explorer', '$(files)']]);
  assert.equal(manifest.contributes.configuration.properties['obra.sidebar.enabled'].default, true);
  for (const views of Object.values(manifest.contributes.views)) assert.equal(views[0].when, 'config.obra.sidebar.enabled');
  assert.equal(manifest.contributes.viewsWelcome.length, 5);
});
test('standalone build checks drift without overwriting', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obra-extension-'));
  try {
    emitExtension(dir); emitExtension(dir, true);
    writeFileSync(join(dir, 'extension.cjs'), 'drift');
    assert.throws(() => emitExtension(dir, true), /Stale extension/);
    assert.equal(readFileSync(join(dir, 'extension.cjs'), 'utf8'), 'drift');
  } finally { rmSync(dir, { recursive: true }); }
});
test('sample matches Storybook hierarchy exactly and has no preview DOM dependency', () => {
  const reference = readFileSync(new URL('../../obra-ui-storybook/src/workbench/content.ts', import.meta.url), 'utf8');
  const expected = reference.slice(reference.indexOf('const WORK_UNIT_CHILDREN'), reference.indexOf('\nexport function explorerTree')).replace('export const EXPLORER_ITEMS: TreeItemSpec[]', 'const EXPLORER_ITEMS');
  assert.equal(readFileSync(new URL('../src/sample.cjs', import.meta.url), 'utf8').replace(/^\/\*[\s\S]*?\*\/\n/, ''), expected + '\nmodule.exports = EXPLORER_ITEMS;\n');
});
