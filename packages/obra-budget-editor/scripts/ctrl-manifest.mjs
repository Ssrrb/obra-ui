// Writes dist-ctrl/manifest.json: every file with sha256 and size, plus the
// upstream commit and package version (see PROVENANCE.md).
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join, relative, sep } from 'node:path';

const UPSTREAM = {
  repository: 'https://github.com/OpenAEC-Foundation/open-calc-studio',
  commit: 'b47042704efa388d95eb59ce77d23aeb5ee0e44c',
  version: '0.13.0',
};
const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist-ctrl');
const pkg = JSON.parse(readFileSync(join(root, 'package.json'), 'utf8'));

const walk = (dir) => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? walk(p) : [p];
});

const files = walk(dist)
  .map((p) => relative(dist, p).split(sep).join('/'))
  .filter((p) => p !== 'manifest.json')
  .sort()
  .map((p) => {
    const buf = readFileSync(join(dist, p));
    return { path: p, bytes: buf.length, sha256: createHash('sha256').update(buf).digest('hex') };
  });

const manifest = {
  name: pkg.name,
  version: pkg.version,
  upstream: UPSTREAM,
  entry: { script: 'budget-editor.js', style: 'budget-editor.css', scriptType: 'module' },
  files,
};
writeFileSync(join(dist, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
console.log(`dist-ctrl/manifest.json: ${files.length} files, ${files.reduce((s, f) => s + f.bytes, 0)} bytes`);
