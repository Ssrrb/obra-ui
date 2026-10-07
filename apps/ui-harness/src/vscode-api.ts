/**
 * Mock of the VS Code webview API (`acquireVsCodeApi`).
 *
 * SURFACE_RULES.md: "`acquireVsCodeApi()` is called once. In tests and the
 * harness it is mocked." This module is that mock. It is a singleton factory:
 * `installVsCodeApiMock()` puts `window.acquireVsCodeApi` in place and the
 * second call to it throws, exactly like the real host — a surface that
 * acquires twice has a bug the harness must surface, not hide.
 *
 * The mock does three jobs:
 * 1. serve `getState`/`setState` from a clone of the fixture's initial state,
 * 2. record every outbound `postMessage` in order (tests assert on them),
 * 3. inject host->webview messages as real `message` events on `window`, the
 *    same channel a production webview listens on — surfaces cannot tell the
 *    difference between the harness and the host.
 *
 * `src/main.ts` installs the mock before any surface code runs, so a surface
 * may call `acquireVsCodeApi()` the moment it mounts.
 */

/** The subset of the real API surfaces use (typed bridge, no host internals). */
export interface VsCodeApi {
  getState(): unknown;
  setState<T>(state: T): T;
  postMessage(message: unknown): void;
}

/** Handle returned by `installVsCodeApiMock()` for harness/test control. */
export interface VsCodeApiMock {
  /** The api object handed to the surface. */
  readonly api: VsCodeApi;
  /** Every message the webview posted, in order. */
  readonly outbound: readonly unknown[];
  /** Current `setState` value (what a real host would persist). */
  state(): unknown;
  /** Deliver a host->webview message through `window`'s `message` event. */
  injectHostMessage(data: unknown): void;
  /** Forget recorded outbound messages (used by harness reset). */
  clearOutbound(): void;
}

/**
 * Create (but do not install) a mock. Exported for tests that want an
 * isolated instance without touching `window`.
 */
export function createVsCodeApiMock(initialState?: unknown): VsCodeApiMock {
  let state: unknown = initialState === undefined ? null : structuredClone(initialState);
  const sent: unknown[] = [];

  const api: VsCodeApi = {
    getState: () => (state === null ? undefined : structuredClone(state)),
    setState<T>(next: T): T {
      state = structuredClone(next);
      return next;
    },
    postMessage(message: unknown): void {
      sent.push(structuredClone(message));
    },
  };

  return {
    api,
    outbound: sent,
    state: () => (state === null ? undefined : structuredClone(state)),
    injectHostMessage(data: unknown): void {
      window.dispatchEvent(new MessageEvent('message', { data: structuredClone(data) }));
    },
    clearOutbound(): void {
      sent.length = 0;
    },
  };
}

/**
 * Install the singleton on `window.acquireVsCodeApi`. Call before mounting any
 * surface. Re-installing (harness reset) replaces the previous mock; the
 * once-only invariant applies per installed instance, like a real webview
 * session.
 */
export function installVsCodeApiMock(initialState?: unknown): VsCodeApiMock {
  const mock = createVsCodeApiMock(initialState);
  let acquired = false;

  Object.defineProperty(window, 'acquireVsCodeApi', {
    configurable: true,
    writable: false,
    value: (): VsCodeApi => {
      if (acquired) {
        throw new Error('acquireVsCodeApi can only be called once per webview session');
      }
      acquired = true;
      return mock.api;
    },
  });

  return mock;
}

declare global {
  interface Window {
    acquireVsCodeApi?: () => VsCodeApi;
  }
}
