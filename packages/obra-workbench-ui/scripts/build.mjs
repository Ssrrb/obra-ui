import { mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
export const extensionPath = 'extensions/obra-workbench-ui';
export function emitExtension(destination, check = false) {
  const files = readdirSync(resolve(root, 'src')).sort();
  if (!check) mkdirSync(destination, { recursive: true });
  for (const file of files) {
    const source = readFileSync(resolve(root, 'src', file));
    const target = resolve(destination, file);
    if (check) {
      if (!source.equals(readFileSync(target))) throw new Error(`Stale extension: ${target}`);
    } else writeFileSync(target, source);
  }
  const extras = readdirSync(destination).filter(file => !files.includes(file));
  if (check && extras.length) throw new Error(`Unexpected extension artifacts: ${extras.join(', ')}`);
  for (const extra of extras) rmSync(resolve(destination, extra), { recursive: true });
}
function main() {
  const args = process.argv.slice(2);
  let check = false;
  let fork;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--check') check = true;
    else if (args[i] === '--vscode-root' && args[i + 1]) fork = resolve(args[++i]);
    else throw new Error(`Unknown argument: ${args[i]}`);
  }
  if (fork) JSON.parse(readFileSync(resolve(fork, 'product.json')));
  emitExtension(resolve(root, 'dist/extension'), check);
  if (!check) rmSync(resolve(root, 'dist/sidebar.css'), { force: true });
  if (fork) emitExtension(resolve(fork, extensionPath), check);
  console.log(`[workbench-ui] ${check ? 'Checked' : 'Generated'} standalone native extension.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main();
