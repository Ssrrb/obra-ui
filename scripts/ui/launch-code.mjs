#!/usr/bin/env node
/**
 * launch-code.mjs — launch the real Code OSS fork with an isolated test profile.
 *
 * Used two ways:
 *   CLI:      `pnpm obra:launch [path-to-open]` (root script `obra:launch`)
 *             Prints exactly one JSON handle on stdout:
 *               {"cdpPort":<int>,"pid":<int>,"profile":"<tmp dir>"}
 *             Stays attached while the app runs; Ctrl-C / SIGTERM kills the
 *             app and removes the profile.
 *   Library:  `import { launchCode } from './launch-code.mjs'` — run-flow.mjs
 *             calls launchCode({ openPath }) and gets the same handle plus a
 *             `dispose()` for lifecycle/cleanup.
 *
 * Never touches a personal profile: a fresh profile is created under
 * os.tmpdir()/obra-ui-test-<rand> and removed on cleanup (unless
 * --keep-profile). Remote debugging is always enabled so CDP clients
 * (playwright-core) can attach.
 *
 * Diagnostics go to stderr. Nothing but the JSON handle is written to stdout.
 */

import { spawn } from 'node:child_process';
import fs from 'node:fs';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HARNESS_DIR = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(HARNESS_DIR, '..', '..'); // ui/
const FORK_ROOT = path.resolve(REPO_ROOT, '..', 'vscode'); // the real Code OSS fork

const PROFILE_PREFIX = 'obra-ui-test-';
const DEVTOOLS_ACTIVE_PORT_FILE = 'DevToolsActivePort';
const READINESS_TIMEOUT_MS = 90_000;

/** True when this file is the entry point (not imported by run-flow). */
function isMain() {
  if (!process.argv[1]) return false;
  try {
    return import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
  } catch {
    return false;
  }
}

function fail(message, detail) {
  process.stderr.write(`[launch-code] ERROR: ${message}\n`);
  if (detail) process.stderr.write(`[launch-code] ${detail}\n`);
  process.exitCode = 1;
  throw new Error(message);
}

/**
 * Resolve the built Electron binary of the fork and verify build
 * prerequisites. Fails with actionable build instructions when the fork has
 * not been built.
 */
export function resolveElectronBinary(forkRoot = FORK_ROOT) {
  const productJsonPath = path.join(forkRoot, 'product.json');
  if (!fs.existsSync(productJsonPath)) {
    fail(
      `The Code OSS fork was not found at ${forkRoot}.`,
      'scripts/ui/launch-code.mjs expects the fork checkout next to the ui checkout.',
    );
  }
  const product = JSON.parse(fs.readFileSync(productJsonPath, 'utf8'));

  const nameLong = product.nameLong;
  const nameShort = product.nameShort;
  const applicationName = product.applicationName || nameShort;

  let binaryPath;
  switch (process.platform) {
    case 'darwin':
      binaryPath = path.join(
        forkRoot, '.build', 'electron', `${nameLong}.app`, 'Contents', 'MacOS', nameShort,
      );
      break;
    case 'win32':
      binaryPath = path.join(forkRoot, '.build', 'electron', `${nameShort}.exe`);
      break;
    default:
      binaryPath = path.join(forkRoot, '.build', 'electron', applicationName);
  }

  const codeSh = path.join(forkRoot, 'scripts', 'code.sh');
  const mainJs = path.join(forkRoot, 'out', 'main.js');

  if (!fs.existsSync(binaryPath)) {
    const lines = [
      `Built Code OSS Electron binary not found: ${binaryPath}`,
      '',
      'The real host must be built first. From a terminal run:',
      `  cd ${forkRoot}`,
      '  ./scripts/code.sh',
      '',
      'That script performs the build prerequisites (npm install, workbench',
      'compile, Electron download) and needs network access and build tools.',
      'Once it succeeds, .build/electron/<app binary> exists and',
      'scripts/ui/launch-code.mjs can launch it. Re-run this command afterwards.',
    ];
    process.stderr.write(`[launch-code] ERROR: ${lines.join('\n')}\n`);
    throw new Error('Code OSS fork is not built. See stderr for build instructions.');
  }

  if (!fs.existsSync(mainJs)) {
    process.stderr.write(
      [
        `[launch-code] ERROR: Electron binary exists but the workbench is not compiled: ${mainJs}`,
        `Build it with:  cd ${forkRoot} && ./scripts/code.sh`,
        '(or `npm run compile` inside the fork once its npm dependencies are installed)',
      ].join('\n') + '\n',
    );
    throw new Error('Code OSS fork is not compiled. See stderr for build instructions.');
  }

  return { forkRoot, binaryPath, mainJs, product };
}

/** Grab a free TCP port on 127.0.0.1. Chromium confirms the real port later. */
export function pickFreePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', reject);
    server.listen(0, '127.0.0.1', () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

function createProfileDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), PROFILE_PREFIX));
}

/**
 * Wait for Chromium to publish the DevToolsActivePort file inside the profile
 * dir; its first line is the port actually selected (also covers --port 0).
 */
function readDevToolsPort(profileDir, timeoutMs, proc) {
  const file = path.join(profileDir, DEVTOOLS_ACTIVE_PORT_FILE);
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tick = () => {
      if (proc && proc.exitCode !== null) {
        reject(new Error(`Code OSS exited with code ${proc.exitCode} before opening the DevTools port. See stderr above.`));
        return;
      }
      try {
        const text = fs.readFileSync(file, 'utf8');
        const port = Number.parseInt(text.split('\n')[0].trim(), 10);
        if (Number.isInteger(port) && port > 0) {
          resolve(port);
          return;
        }
      } catch {
        // file not written yet; keep polling
      }
      if (Date.now() > deadline) {
        reject(new Error(`Timed out after ${timeoutMs} ms waiting for ${file}. Is remote debugging blocked on this machine?`));
        return;
      }
      setTimeout(tick, 250);
    };
    tick();
  });
}

/**
 * Launch the fork. Returns a handle; call `dispose()` to terminate the app and
 * clean the profile.
 */
export async function launchCode(options = {}) {
  const {
    openPath,
    port,
    keepProfile = false,
    extraArgs = [],
    onSpawnError,
  } = options;

  const { forkRoot, binaryPath } = resolveElectronBinary();
  const profileDir = createProfileDir();
  const requestedPort = port ?? (await pickFreePort());

  const args = [
    // App path for the dev Electron binary. VSCODE_DEV=1 makes the main
    // process strip this first non-option argument (see argvHelper
    // stripAppPath), so it is not treated as a workspace to open.
    '.',
    `--user-data-dir=${profileDir}`,
    `--remote-debugging-port=${requestedPort}`,
    // Automation must not block on the workspace trust dialog.
    '--disable-workspace-trust',
  ];
  if (openPath) args.push(path.resolve(openPath));
  args.push(...extraArgs);

  let proc;
  try {
    proc = spawn(binaryPath, args, {
      cwd: forkRoot,
      env: {
        ...process.env,
        NODE_ENV: 'development',
        VSCODE_DEV: '1',
        ELECTRON_ENABLE_LOGGING: '1',
      },
      stdio: ['ignore', 'ignore', 'pipe'],
    });
  } catch (error) {
    fs.rmSync(profileDir, { recursive: true, force: true });
    if (onSpawnError) onSpawnError(error);
    throw new Error(`Failed to spawn Code OSS at ${binaryPath}: ${error.message}`);
  }

  proc.stderr?.on('data', (chunk) => {
    process.stderr.write(`[code-oss] ${chunk}`);
  });
  proc.on('error', (error) => {
    process.stderr.write(`[launch-code] code-oss process error: ${error.message}\n`);
  });

  let cdpPort;
  try {
    cdpPort = await readDevToolsPort(profileDir, READINESS_TIMEOUT_MS, proc);
  } catch (error) {
    // Kill the app (SIGTERM, then SIGKILL) and remove the profile before failing.
    const exited = await terminateProcess(proc, 5_000);
    fs.rmSync(profileDir, { recursive: true, force: true });
    process.stderr.write(`[launch-code] ${error.message}\n`);
    if (!exited) process.stderr.write('[launch-code] warning: could not terminate Code OSS cleanly.\n');
    throw error;
  }

  const handle = {
    cdpPort,
    pid: proc.pid,
    profile: profileDir,
    proc,
    dispose: () => dispose({ proc, profileDir, keepProfile }),
  };

  process.stderr.write(
    `[launch-code] Code OSS ready (pid ${proc.pid}, cdpPort ${cdpPort}, profile ${profileDir})\n`,
  );
  return handle;
}

/** Terminate a process: SIGTERM first, SIGKILL after the grace period. */
function terminateProcess(proc, graceMs) {
  if (!proc || proc.exitCode !== null || proc.signalCode) return Promise.resolve(true);
  return new Promise((resolve) => {
    let settled = false;
    const done = (ok) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      proc.removeListener('exit', onExit);
      resolve(ok);
    };
    const onExit = () => done(true);
    proc.once('exit', onExit);
    const timer = setTimeout(() => {
      try { proc.kill('SIGKILL'); } catch { /* already gone */ }
      done(false);
    }, graceMs);
    try { proc.kill('SIGTERM'); } catch (error) {
      done(true);
    }
  });
}

/** Kill the app, wait for exit, and remove the isolated profile. */
export async function dispose({ proc, profileDir, keepProfile = false }) {
  await terminateProcess(proc, 5_000);
  if (!keepProfile && profileDir) {
    fs.rmSync(profileDir, { recursive: true, force: true });
  }
}

async function main() {
  const argv = process.argv.slice(2);
  const extraArgs = [];
  let openPath;
  let port;
  let keepProfile = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--port') {
      port = Number.parseInt(argv[++i], 10);
      if (!Number.isInteger(port) || port <= 0 || port > 65535) {
        fail(`--port must be an integer between 1 and 65535, got "${argv[i]}"`);
      }
    } else if (arg === '--keep-profile') {
      keepProfile = true;
    } else if (arg === '--') {
      extraArgs.push(...argv.slice(i + 1));
      break;
    } else if (arg.startsWith('-')) {
      fail(`Unknown option "${arg}". Supported: --port <n>, --keep-profile, -- <extra Code OSS args>`);
    } else {
      if (openPath !== undefined) fail(`Only one path to open is supported (got "${openPath}" and "${arg}")`);
      openPath = arg;
    }
  }

  const handle = await launchCode({ openPath, port, keepProfile });
  const { proc, profileDir, ...handleOut } = handle;

  // Exactly one JSON object on stdout; everything else goes to stderr.
  process.stdout.write(JSON.stringify(handleOut) + '\n');

  let disposed = false;
  const cleanup = async () => {
    if (disposed) return;
    disposed = true;
    process.stderr.write('[launch-code] shutting down Code OSS and cleaning the profile\n');
    await handle.dispose();
    process.exit(0);
  };
  process.on('SIGINT', cleanup);
  process.on('SIGTERM', cleanup);
  process.on('exit', () => {
    if (!disposed) {
      disposed = true;
      try { proc.kill('SIGTERM'); } catch { /* gone */ }
      fs.rmSync(profileDir, { recursive: true, force: true });
    }
  });
  proc.on('exit', (code, signal) => {
    disposed = true; // profile already handled below
    fs.rmSync(profileDir, { recursive: true, force: true });
    process.stderr.write(`[launch-code] Code OSS exited (code ${code}, signal ${signal})\n`);
    process.exit(code ?? (signal ? 1 : 0));
  });
}

if (isMain()) {
  main().catch((error) => {
    process.stderr.write(`[launch-code] ${error.message}\n`);
    process.exit(1);
  });
}
