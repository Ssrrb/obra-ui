import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const gen = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '..', 'design', 'generated');
const css = readFileSync(join(gen, 'tokens.css'), 'utf8');
const fb = readFileSync(join(gen, 'vscode-fallback.css'), 'utf8');
const ts = readFileSync(join(gen, 'tokens.ts'), 'utf8');

test('tokens.css defines semantic vars from tokens only', () => {
  for (const v of ['--obra-surface-default', '--obra-text-primary', '--obra-border-focus', '--obra-action-primary-background']) {
    assert.ok(css.includes(v + ':'), `missing ${v}`);
  }
});

test('vscode-fallback.css maps semantic vars to --vscode-* with a fallback', () => {
  assert.match(fb, /--obra-surface-default:\s*var\(--vscode-editor-background,\s*#[0-9a-f]{6}\)/i);
  assert.match(fb, /--obra-border-focus:\s*var\(--vscode-focusBorder,/i);
});

test('tokens.ts exports a tokenPaths array', () => {
  assert.ok(ts.includes('export const tokenPaths'));
  assert.ok(ts.includes('"surface.default"'));
});
