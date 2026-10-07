#!/usr/bin/env node
/**
 * run-flow.mjs — run a named UI flow inside the real Code OSS fork.
 *
 * Usage:
 *   pnpm ui:e2e <flow>          (root script)
 *   node scripts/ui/run-flow.mjs <flow>
 *
 * What it does:
 *   1. Validates the flow name and loads scripts/ui/flows/<flow>.mjs.
 *   2. Launches the Code OSS fork (see launch-code.mjs) with a fresh isolated
 *      profile and remote debugging, opening the flow's fixture project.
 *   3. Connects over CDP with playwright-core, finds the workbench page,
 *      waits for `.monaco-workbench`, and calls the flow's `run(ctx)`.
 *   4. Captures screenshots via ctx.capture and cleans everything up.
 *
 * Result JSON goes to stdout:
 *   {"flow":"<name>","status":"passed|failed|not-implemented","steps":[...],"durationMs":<n>}
 * Diagnostics go to stderr. Exit codes: 0 passed, 1 failed, 2 not-implemented
 * (the product command/screen does not exist in the real fork yet).
 */

import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { launchCode, dispose } from './launch-code.mjs';
import { capture, validateFlowName, CAPTURES_ROOT } from './capture.mjs';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const FLOWS_DIR = path.join(HARNESS_DIR, 'flows');
const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..');

const WORKBENCH_WAIT_MS = 120_000;

function die(message, detail) {
  process.stderr.write(`[run-flow] ERROR: ${message}\n`);
  if (detail) process.stderr.write(`[run-flow] ${detail}\n`);
  process.exit(1);
}

function isMain() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
}

/**
 * Resolve playwright-core without assuming where node_modules live
 * (scripts/ui is not a pnpm workspace package). Tries the local install first,
 * then the repo workspace, then packages that declare playwright.
 */
function resolvePlaywrightCore() {
  const require = createRequire(import.meta.url);
  const candidates = [
    HARNESS_DIR,
    REPO_ROOT,
    path.join(REPO_ROOT, 'packages', 'obra-ui-storybook'),
    path.join(REPO_ROOT, 'packages', 'obra-ui-storybook', 'node_modules', 'playwright'),
    path.join(REPO_ROOT, 'packages', 'obra-ui'),
  ];
  for (const base of candidates) {
    try {
      return require.resolve('playwright-core', { paths: [base] });
    } catch {
      // try next candidate
    }
  }
  process.stderr.write(
    [
      '[run-flow] playwright-core is not installed.',
      '',
      'Fix (any of):',
      `  1. cd ${REPO_ROOT} && pnpm install`,
      '     (installs the workspace; playwright in packages/obra-ui-storybook',
      '      brings playwright-core along, which run-flow resolves automatically)',
      `  2. cd ${HARNESS_DIR} && npm install`,
      '     (installs scripts/ui/package.json, which declares playwright-core)',
      '',
      'No network access is needed at flow runtime, only at install time.',
    ].join('\n') + '\n',
  );
  throw new Error('playwright-core missing. Run `pnpm install` at the repo root first.');
}

/** The workbench page of the launched app (matches any workbench.html URL). */
function findWorkbenchPage(browser) {
  for (const context of browser.contexts()) {
    for (const page of context.pages()) {
      if (/workbench\.html/.test(page.url())) return page;
    }
  }
  return null;
}

async function waitForWorkbench(browser, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const page = findWorkbenchPage(browser);
    if (page) {
      try {
        await page.waitForSelector('.monaco-workbench', { timeout: 5_000 });
        return page;
      } catch {
        // workbench page found but shell not ready yet; keep waiting
      }
    }
    if (Date.now() > deadline) {
      throw new Error(
        `No workbench page appeared within ${timeoutMs} ms. The app may have failed to start; check stderr for [code-oss] output.`,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/** Statuses: passed (0), failed (1), not-implemented (2). */
const NOT_IMPLEMENTED_PREFIX = 'NOT IMPLEMENTED IN HOST:';
const NOT_IMPLEMENTED_EXIT = 2;

async function runFlow(flowName) {
  const flowPath = path.join(FLOWS_DIR, `${flowName}.mjs`);
  if (!fs.existsSync(flowPath)) {
    die(
      `Unknown flow "${flowName}".`,
      `Available flows: ${
        fs.existsSync(FLOWS_DIR)
          ? fs.readdirSync(FLOWS_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, '')).join(', ')
          : '(flows directory missing)'
      }`,
    );
  }

  // playwright-core must be resolvable before we spend time launching the app.
  let playwrightCorePath;
  try {
    playwrightCorePath = resolvePlaywrightCore();
  } catch {
    process.exit(1); // resolvePlaywrightCore printed actionable instructions
  }
  const require = createRequire(import.meta.url);
  const { chromium } = require(playwrightCorePath);

  const flow = await import(pathToFileURL(flowPath).href);
  if (typeof flow.run !== 'function') {
    die(`Flow "${flowName}" must export an async run(ctx) function.`);
  }

  const fixtureRel = flow.fixture; // e.g. '../fixtures/cost-control'
  const openPath = fixtureRel
    ? path.resolve(path.dirname(flowPath), fixtureRel)
    : undefined;
  if (fixtureRel && !(openPath && fs.existsSync(openPath))) {
    die(`Flow "${flowName}" declares fixture "${fixtureRel}" but it does not exist at ${openPath}.`);
  }

  const steps = [];
  const startedAt = Date.now();
  const launch = await launchCode({ openPath });
  let browser;

  try {
    browser = await chromium.connectOverCDP(`http://127.0.0.1:${launch.cdpPort}`);
    const page = await waitForWorkbench(browser, WORKBENCH_WAIT_MS);

    const ctx = {
      flow: flowName,
      page,
      cdpPort: launch.cdpPort,
      profile: launch.profile,
      fixture: openPath,
      capture: async (step) => {
        const file = await capture({ page, flow: flowName, step });
        steps.push(step);
        process.stderr.write(`[run-flow] captured ${file}\n`);
        return file;
      },
      log: (message) => process.stderr.write(`[run-flow:${flowName}] ${message}\n`),
    };

    process.stderr.write(`[run-flow] running flow "${flowName}"\n`);
    await flow.run(ctx);

    const result = { flow: flowName, status: 'passed', steps, durationMs: Date.now() - startedAt };
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = 0;
  } catch (error) {
    const isNotImplemented =
      typeof error?.message === 'string' && error.message.startsWith(NOT_IMPLEMENTED_PREFIX);
    // Best-effort evidence capture of the failure state.
    try {
      const page = browser ? findWorkbenchPage(browser) : null;
      if (page) await capture({ page, flow: flowName, step: 'zz-error' });
    } catch {
      // screenshot of failure is best effort
    }
    process.stderr.write(`[run-flow] flow "${flowName}" failed: ${error?.stack || error}\n`);
    const result = {
      flow: flowName,
      status: isNotImplemented ? 'not-implemented' : 'failed',
      steps,
      durationMs: Date.now() - startedAt,
      error: error?.message ?? String(error),
    };
    process.stdout.write(JSON.stringify(result) + '\n');
    process.exitCode = isNotImplemented ? NOT_IMPLEMENTED_EXIT : 1;
  } finally {
    if (browser) {
      try { browser.close(); } catch { /* connection already gone */ }
    }
    await dispose({ proc: launch.proc, profileDir: launch.profile, keepProfile: false });
  }
}

export async function main() {
  const flowName = process.argv[2];
  if (!flowName) {
    const available = fs.existsSync(FLOWS_DIR)
      ? fs.readdirSync(FLOWS_DIR).filter((f) => f.endsWith('.mjs')).map((f) => f.replace(/\.mjs$/, '')).join(', ')
      : '(none)';
    process.stderr.write(
      `Usage: node scripts/ui/run-flow.mjs <flow>\nAvailable flows: ${available}\n`,
    );
    process.exit(1);
  }
  try {
    validateFlowName(flowName);
  } catch (error) {
    die(error.message);
  }
  await runFlow(flowName);
}

if (isMain()) {
  main().catch((error) => {
    process.stderr.write(`[run-flow] ${error?.stack || error}\n`);
    process.exit(1);
  });
}

// Re-exported for programmatic use and testing.
export { capture, validateFlowName, CAPTURES_ROOT };
