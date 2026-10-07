/**
 * Harness entry point.
 *
 * Boot order matters:
 * 1. import the generated token layer and harness chrome (no color or spacing
 *    is defined anywhere else in this app — Principles 4, 5),
 * 2. `defineObraUI()` registers every custom element once,
 * 3. the `acquireVsCodeApi` mock is installed on `window` BEFORE any surface
 *    code runs (SURFACE_RULES.md),
 * 4. the fixture's host->webview messages are scheduled, and the surface is
 *    mounted into `#harness-root`.
 *
 * URL selection (documented in index.html and README.md):
 *   ?fixture=<id>  fixture from fixtures/index.ts (default: normal)
 *   ?surface=<id>  surface from src/surfaces/index.ts (default: the fixture's)
 * An unknown id renders a harness error and never falls back.
 *
 * Interactive fixtures (Phase 9) may carry `createResponder()`: a
 * deterministic mock host that answers the surface's requests through the
 * same scheduled-delivery path as fixture messages, so `whenSettled()` stays
 * authoritative for every host answer a test triggers.
 *
 * Test handle: `window.__obraHarness` (see the interface below) is what
 * Playwright uses to settle delayed fixtures, assert outbound messages, inject
 * extra host messages, and reset the page deterministically.
 */
import '@obra/ui/tokens.css';
import './harness.css';

import { defineObraUI } from '@obra/ui';
import { fixtures } from '../fixtures/index.js';
import type { HarnessFixture } from '../fixtures/types.js';
import type { FixtureMessage, FixtureResponder } from '../fixtures/types.js';
import { el } from './dom.js';
import { surfaces } from './surfaces/index.js';
import type { HarnessSurface } from './surfaces/types.js';
import { installVsCodeApiMock } from './vscode-api.js';
import type { VsCodeApi, VsCodeApiMock } from './vscode-api.js';

/** Test/automation handle published on `window.__obraHarness`. */
export interface ObraHarnessHandle {
  readonly fixtureId: string;
  readonly surfaceId: string;
  /** Outbound webview->host messages recorded by the mock, in order. */
  outbound(): readonly unknown[];
  /** Current persisted state (what the host would return from getState). */
  state(): unknown;
  /** Deliver an extra host->webview message immediately. */
  injectHostMessage(data: unknown): void;
  /**
   * Resolves once every scheduled fixture message — delayed ones included —
   * has been dispatched and two animation frames have passed, so a screenshot
   * taken afterwards is stable. Tests await this instead of sleeping.
   */
  whenSettled(): Promise<void>;
  /** Tear down and re-run the fixture from scratch (fresh mock, fresh DOM). */
  reset(): void;
}

declare global {
  interface Window {
    __obraHarness: ObraHarnessHandle;
  }
}

const params = new URLSearchParams(window.location.search);
const fixtureId = params.get('fixture') ?? 'normal';
const surfaceParam = params.get('surface');

defineObraUI();

const rootElement = document.getElementById('harness-root');
if (!rootElement) throw new Error('Harness boot failed: #harness-root is missing from index.html.');
const root: HTMLElement = rootElement;

/** Render a terminal harness error. Never a silent fallback (README.md). */
function failHarness(message: string): void {
  root.dataset.state = 'harness-error';
  root.replaceChildren(el('obra-error-state', { message }));
}

function start(fixture: HarnessFixture, surface: HarnessSurface): void {
  let mock: VsCodeApiMock = installVsCodeApiMock(fixture.initialState);
  // Fresh responder world per run/reset — no state leaks between sessions.
  let responder: FixtureResponder | null = fixture.createResponder?.() ?? null;
  let disposeSurface: (() => void) | null = null;
  let timers: number[] = [];
  let pending = 0;
  let settleWaiters: Array<() => void> = [];

  function deliver(data: unknown): void {
    mock.injectHostMessage(data);
    pending -= 1;
    if (pending === 0) {
      const waiters = settleWaiters;
      settleWaiters = [];
      for (const resolve of waiters) resolve();
    }
  }

  /** Schedule one host->webview delivery (fixed delayMs literal or 0). */
  function scheduleMessage(scheduled: FixtureMessage): void {
    pending += 1;
    const timer = window.setTimeout(() => {
      timers = timers.filter((entry) => entry !== timer);
      deliver(scheduled.data);
    }, scheduled.delayMs ?? 0);
    timers.push(timer);
  }

  /** Schedule every fixture message; delayed ones use their fixed delayMs. */
  function scheduleMessages(): void {
    for (const scheduled of fixture.messages) scheduleMessage(scheduled);
  }

  function nextFrame(): Promise<void> {
    return new Promise((resolve) => {
      window.requestAnimationFrame(() => resolve());
    });
  }

  async function whenSettled(): Promise<void> {
    while (pending > 0) {
      await new Promise<void>((resolve) => {
        settleWaiters.push(resolve);
      });
    }
    // Two frames: one for the custom elements to render, one for layout to
    // settle — the deterministic replacement for `waitForTimeout`.
    await nextFrame();
    await nextFrame();
  }

  function run(): void {
    // Acquire through window, like a production webview does — this exercises
    // the mock's once-per-session invariant on every (re)install.
    const acquire = window.acquireVsCodeApi;
    if (!acquire) {
      throw new Error('acquireVsCodeApi mock missing from window — install it before mounting a surface.');
    }
    const api = acquire();
    // Bridge the surface's outbound channel through the fixture responder:
    // every reply is scheduled like a fixture message, so whenSettled() also
    // waits out delayed mock-host answers (e.g. the AI analysis).
    const bridged: VsCodeApi = {
      getState: () => api.getState(),
      setState: (state) => api.setState(state),
      postMessage(message: unknown): void {
        api.postMessage(message);
        if (!responder) return;
        const replies = responder(message);
        if (!replies) return;
        for (const reply of replies) scheduleMessage(reply);
      },
    };
    disposeSurface = surface.mount(root, bridged);
    scheduleMessages();
  }

  function reset(): void {
    disposeSurface?.();
    disposeSurface = null;
    for (const timer of timers) window.clearTimeout(timer);
    timers = [];
    const interruptedWaiters = settleWaiters;
    settleWaiters = [];
    pending = 0;
    root.replaceChildren();
    delete root.dataset.state;
    // Fresh mock: the fixture's initial state is cloned again and outbound
    // recording starts from zero, so a reset run is byte-identical to a
    // fresh page load.
    mock = installVsCodeApiMock(fixture.initialState);
    responder = fixture.createResponder?.() ?? null;
    run();
    for (const resolve of interruptedWaiters) resolve();
  }

  run();

  window.__obraHarness = {
    fixtureId: fixture.id,
    surfaceId: surface.id,
    outbound: () => mock.outbound,
    state: () => mock.state(),
    injectHostMessage: (data) => mock.injectHostMessage(data),
    whenSettled,
    reset,
  };
}

const fixture = fixtures[fixtureId];
if (!fixture) {
  failHarness(
    `Unknown fixture "${fixtureId}". Known fixtures: ${Object.keys(fixtures).join(', ')}. ` +
      'The harness never falls back to another fixture.',
  );
} else {
  const surfaceId = surfaceParam ?? fixture.surface;
  const surface = surfaces[surfaceId];
  if (!surface) {
    failHarness(`Unknown surface "${surfaceId}". Known surfaces: ${Object.keys(surfaces).join(', ')}.`);
  } else {
    start(fixture, surface);
  }
}
