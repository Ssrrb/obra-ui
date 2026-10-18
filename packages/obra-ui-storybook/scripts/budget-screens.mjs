// Visual smoke test: screenshot the budget workbench stories from the built
// Storybook. Run after `pnpm build-storybook`. Output goes to ../../../.tmp/.
import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { extname, join, normalize } from 'node:path';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');
const staticDir = join(root, 'storybook-static');
const outDir = join(root, '..', '..', '.tmp', 'budget-screens');
if (!existsSync(staticDir)) { console.error('Run pnpm build-storybook first'); process.exit(1); }
mkdirSync(outDir, { recursive: true });

const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

const server = createServer((req, res) => {
  let path = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
  if (path === '/' || path === '') path = '/index.html';
  const file = join(staticDir, path);
  if (!file.startsWith(staticDir) || !existsSync(file)) {
    res.writeHead(404).end('not found');
    return;
  }
  res.writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((r) => server.listen(4183, r));

const { chromium } = await import('playwright');
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
page.on('console', (msg) => {
  if (msg.type() === 'error' || msg.type() === 'warning') console.log(`[console:${msg.type()}] ${msg.text().slice(0, 200)}`);
});
page.on('pageerror', (err) => console.log(`[pageerror] ${String(err).slice(0, 300)}`));

const STORIES = [
  ['workbench-project--budget', 'budget'],
  ['workbench-project--overcommitment', 'overcommitment'],
  ['workbench-project--budget-import-source', 'import-source'],
  ['workbench-project--budget-import-structure', 'import-structure'],
  ['workbench-project--budget-import-review', 'import-review'],
  ['workbench-project--budget-import-review-no-balance', 'import-review-nobalance'],
  ['workbench-project--budget-import-confirm', 'import-confirm'],
  ['workbench-project--budget-import-confirm-no-balance', 'import-confirm-nobalance'],
  ['workbench-project--budget-import-result', 'import-result'],
  ['workbench-project--budget-item-select', 'item-select'],
];

for (const [id, name] of STORIES) {
  await page.goto(`http://localhost:4183/iframe.html?id=${id}&viewMode=story&globals=theme:dark`, { waitUntil: 'networkidle' });
  try {
    await page.waitForSelector('.obra-wb', { timeout: 10000 });
  } catch {
    console.log(`!! ${name}: .obra-wb never mounted`);
  }
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(outDir, `${name}.png`) });
  console.log(`shot ${name}`);
}

await browser.close();
server.close();
process.exit(0);
