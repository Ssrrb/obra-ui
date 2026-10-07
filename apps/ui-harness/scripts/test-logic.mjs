import { mkdtempSync, writeFileSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);
const root = fileURLToPath(new URL('../', import.meta.url));
const temporary = mkdtempSync(join(tmpdir(), 'obra-cost-logic-'));
const output = join(temporary, 'output');
let status = 1;
try {
  const config = join(temporary, 'tsconfig.json');
  writeFileSync(config, JSON.stringify({
    extends: resolve(root, 'tsconfig.json'),
    compilerOptions: {
      noEmit: false, rootDir: root, outDir: output,
      typeRoots: [resolve(root, 'node_modules/@types')],
    },
    include: [resolve(root, 'tests/logic/*.test.ts')],
  }));
  const compile = spawnSync(process.execPath, [require.resolve('typescript/bin/tsc'), '-p', config], { cwd: root, stdio: 'inherit' });
  if (compile.error) throw compile.error;
  if (compile.status !== 0) process.exitCode = compile.status ?? 1;
  else {
    writeFileSync(join(output, 'package.json'), '{"type":"module"}');
    const tests = readdirSync(join(output, 'tests/logic')).filter((name) => name.endsWith('.test.js')).map((name) => join(output, 'tests/logic', name));
    const result = spawnSync(process.execPath, ['--test', ...tests], { cwd: output, stdio: 'inherit' });
    if (result.error) throw result.error;
    status = result.status ?? 1;
  }
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
process.exitCode = status;
