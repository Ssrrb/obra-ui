/**
 * Fixture registry.
 *
 * The harness resolves `?fixture=<id>` against this map. An unknown id renders
 * a harness error — the registry never falls back to a default fixture, so a
 * typo in a test or URL cannot silently record the wrong baseline.
 */
import { emptyFixture } from './empty.js';
import { errorFixture } from './error.js';
import { largeDatasetFixture } from './largeDataset.js';
import { loadingFixture } from './loading.js';
import { normalFixture } from './normal.js';
import { permissionDeniedFixture } from './permissionDenied.js';
import { slowFixture } from './slow.js';
import type { HarnessFixture } from './types.js';

export const fixtures: Readonly<Record<string, HarnessFixture>> = {
  normal: normalFixture,
  loading: loadingFixture,
  empty: emptyFixture,
  error: errorFixture,
  slow: slowFixture,
  permissionDenied: permissionDeniedFixture,
  largeDataset: largeDatasetFixture,
};

/** Every registered fixture id, in registry order. */
export const fixtureIds: readonly string[] = Object.keys(fixtures);

export type { FixtureMessage, HarnessFixture } from './types.js';
export type {
  CostControlHostMessage,
  CostControlPersistedState,
  CostControlWebviewMessage,
  CostRow,
} from './protocol.js';
