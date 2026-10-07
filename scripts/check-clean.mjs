#!/usr/bin/env node
// Fails when the working tree is dirty. Used by `pnpm ui:tokens:check` in CI:
// regenerate artifacts, then assert the committed files equal the source.
import { execSync } from 'node:child_process';

const out = execSync('git status --porcelain', { encoding: 'utf8' });
if (out.trim()) {
  console.error('[tokens:check] generated artifacts differ from committed source:\n' + out);
  process.exit(1);
}
console.log('[tokens:check] clean — generated tokens match source.');
