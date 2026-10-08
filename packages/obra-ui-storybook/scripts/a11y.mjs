#!/usr/bin/env node
// Run axe-core over every story in the *built* Storybook.
//
// Prerequisites (see README.md):
//   1. pnpm install                         (installs axe + Playwright)
//   2. pnpm build-storybook                 (writes storybook-static/)
//   3. npx playwright install chromium      (downloads the browser — needs network)
// Then: pnpm ui:a11y
//
// Exits non-zero when any story reports an axe violation, so CI can gate on it.
import { existsSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const staticDir = join(root, 'storybook-static');
const indexPath = join(staticDir, 'index.json');

if (!existsSync(indexPath)) {
  console.error('[a11y] storybook-static/index.json not found.');
  console.error('[a11y] Run `pnpm build-storybook` first (see README.md).');
  process.exit(1);
}

let chromium;
let AxeBuilder;
try {
  ({ chromium } = await import('playwright'));
  ({ default: AxeBuilder } = await import('@axe-core/playwright'));
} catch (error) {
  console.error('[a11y] Missing accessibility dev dependency. Run `pnpm install` first.');
  console.error(String(error));
  process.exit(1);
}

const MIME = {
  '.css': 'text/css',
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.mjs': 'text/javascript',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
};

const server = createServer((req, res) => {
  const url = new URL(req.url ?? '/', 'http://localhost');
  let pathname = decodeURIComponent(url.pathname);
  if (pathname === '/') pathname = '/index.html';
  const file = normalize(join(staticDir, pathname));
  if (!file.startsWith(staticDir) || !existsSync(file)) {
    res.statusCode = 404;
    res.end('not found');
    return;
  }
  res.setHeader('content-type', MIME[extname(file)] ?? 'application/octet-stream');
  res.end(readFileSync(file));
});

// Storybook 8 writes `entries` as an id-keyed object; older builds used an array.
const rawEntries = JSON.parse(readFileSync(indexPath, 'utf8')).entries ?? [];
const entries = Array.isArray(rawEntries) ? rawEntries : Object.values(rawEntries);
const stories = entries.filter((entry) => entry.type === 'story');
if (stories.length === 0) {
  console.error('[a11y] No stories found in storybook-static/index.json.');
  process.exit(1);
}

await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
const { port } = server.address();
const base = `http://127.0.0.1:${port}`;

// Document-scope best-practice rules. A story iframe renders one component on an
// otherwise empty page, so it can never have a <main>, an <h1>, or landmark-
// contained content. Leaving them on buries every real component violation under
// ~350 false positives. Landmark/heading structure is a *page* concern and is
// checked where pages exist: the real Code OSS host (PRINCIPLES.md rule 10).
const DOCUMENT_SCOPE_RULES = ['landmark-one-main', 'page-has-heading-one', 'region'];

const browser = await chromium.launch();
// @axe-core/playwright requires a page from an explicit context.
const context = await browser.newContext();
const page = await context.newPage();
let failing = 0;
const ruleCounts = new Map();

for (const story of stories) {
  const url = `${base}/iframe.html?id=${encodeURIComponent(story.id)}&viewMode=story`;
  await page.goto(url, { waitUntil: 'networkidle' });
  const results = await new AxeBuilder({ page }).disableRules(DOCUMENT_SCOPE_RULES).analyze();
  if (results.violations.length > 0) {
    failing += 1;
    console.error(`[a11y] ${story.id}: ${results.violations.length} violation(s)`);
    for (const violation of results.violations) {
      console.error(`  - ${violation.id} (${violation.impact ?? 'n/a'}): ${violation.help}`);
      for (const node of violation.nodes) {
        console.error(`      ${node.target.join(' ')}`);
      }
      ruleCounts.set(violation.id, (ruleCounts.get(violation.id) ?? 0) + 1);
    }
  }
}

await browser.close();
server.close();

console.log(
  `[a11y] checked ${stories.length} stories; ${failing} with violations` +
    (ruleCounts.size
      ? ` (${[...ruleCounts].map(([id, n]) => `${id} x${n}`).join(', ')})`
      : '') +
    `.`
);
console.log(`[a11y] skipped document-scope rules: ${DOCUMENT_SCOPE_RULES.join(', ')}.`);
process.exit(failing > 0 ? 1 : 0);
