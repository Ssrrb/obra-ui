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
import { longValuesFixture } from './longValues.js';
import { multiProjectFixture } from './multiProject.js';
import { normalFixture } from './normal.js';
import { oneRowFixture } from './oneRow.js';
import { permissionDeniedFixture } from './permissionDenied.js';
import { readOnlyFixture } from './readOnly.js';
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
  // Phase 9 benchmark fixtures.
  multiProject: multiProjectFixture,
  readOnly: readOnlyFixture,
  oneRow: oneRowFixture,
  longValues: longValuesFixture,
};

/** Every registered fixture id, in registry order. */
export const fixtureIds: readonly string[] = Object.keys(fixtures);

export type { FixtureMessage, FixtureResponder, HarnessFixture } from './types.js';
export type {
  CostAnalysisPayload,
  CostControlDataPayload,
  CostControlHostMessage,
  CostControlPersistedState,
  CostControlWebviewMessage,
  CostItemDraft,
  CostItemStatus,
  CostRow,
  ProjectSummary,
} from './protocol.js';
export { COST_ITEM_STATUSES } from './protocol.js';
