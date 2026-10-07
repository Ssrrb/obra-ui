/**
 * Fixture contract shared by every fixture module and the harness registry.
 */
import type { CostControlHostMessage, CostControlPersistedState } from './protocol.js';

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
}
