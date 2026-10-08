import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { test } from 'node:test';
import { emitStylesheet, generateStylesheet } from '../scripts/build.mjs';

test('preserves live theme bindings and excludes unused global tokens', () => {
  const css = generateStylesheet('.monaco-workbench.obra-sidebar .part.sidebar { color: var(--obra-text-primary); }',
    ':root {\n  --obra-text-primary: var(--vscode-foreground, #fff);\n  --obra-unused: #000;\n}');
  assert.match(css, /color: var\(--vscode-foreground, #fff\)/);
  assert.doesNotMatch(css, /:root|--obra-unused/);
  assert.throws(() => generateStylesheet('color: var(--obra-missing)', ''), /Unknown Obra token/);
  assert.throws(() => generateStylesheet('color: var(--obra-text-primary, Canvas)', '\n  --obra-text-primary: var(--vscode-foreground);'), /without a fallback/);
});

test('all authored rules target only the native primary sidebar or side activity bar', () => {
  const source = readFileSync(new URL('../src/sidebar.css', import.meta.url), 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const selectors = source.split('}').filter(block => block.trim()).flatMap(block => block.split('{')[0].split(','));
  for (const selector of selectors) {
    assert.match(selector.trim(), /^\.monaco-workbench\.obra-sidebar \.part\.(sidebar|activitybar)(?:\s|$)/);
  }
});

test('freshness check reports drift without overwriting the artifact', () => {
  const dir = mkdtempSync(join(tmpdir(), 'obra-workbench-ui-'));
  try {
    const file = join(dir, 'sidebar.css');
    emitStylesheet(file, 'generated', false);
    emitStylesheet(file, 'generated', true);
    writeFileSync(file, 'local modification');
    assert.throws(() => emitStylesheet(file, 'generated', true), /Stale stylesheet/);
    assert.equal(readFileSync(file, 'utf8'), 'local modification');
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
