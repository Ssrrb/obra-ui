/**
 * Fixture contract shared by every fixture module and the harness registry.
 */
import type { CostControlHostMessage, CostControlPersistedState } from './protocol.js';

/**
 * Deterministic mock-host responder (Phase 9).
 *
 * Receives every webview->host message the surface posts and returns the
 * host->webview replies the mock host would send — synchronously computed,
 * optionally with a fixed `delayMs`. Returning `undefined`/`[]` means "no
 * answer", which keeps no-response scenarios testable. A responder never
 * reads a clock, `Math.random()`, or the network (fixtures/README.md).
 */
export type FixtureResponder = (
  message: unknown,
) => readonly FixtureMessage[] | undefined;

/** One scheduled host->webview delivery. */
export interface FixtureMessage {
  /** Message payload, dispatched as a `message` event on `window`. */
  readonly data: CostControlHostMessage;
  /**
   * Delivery delay in milliseconds (default 0). This is the only place a
   * fixture may express time, and it is always a fixed literal — fixtures
   * never read a clock. The harness resolves `whenSettled()` only after every
   * delayed message has been dispatched, so tests never sleep a fixed amount.
   */
  readonly delayMs?: number;
}

/** A deterministic scenario for one surface. */
export interface HarnessFixture {
  /** Stable id, matched against `?fixture=` in the URL. */
  readonly id: string;
  /** Surface id this fixture drives (may be overridden with `?surface=`). */
  readonly surface: string;
  /** One sentence for the registry README and reviewer context. */
  readonly description: string;
  /** Value returned by the mocked `getState()` when the surface mounts. */
  readonly initialState: CostControlPersistedState | null;
  /** Host->webview messages, in delivery order. */
  readonly messages: readonly FixtureMessage[];
  /**
   * Factory for the interactive mock host, called once per harness run (and
   * again on every `reset()`), so responder world state never leaks between
   * runs. Fixtures without one are push-only: the surface posts into the
   * void and tests drive answers through `injectHostMessage`.
   */
  readonly createResponder?: () => FixtureResponder;
}
