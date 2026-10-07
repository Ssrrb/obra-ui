/**
 * Fixture: slow — a delayed success.
 *
 * The data message is delivered after a fixed `SLOW_DELAY_MS`. Tests never
 * sleep this duration: `window.__obraHarness.whenSettled()` resolves only once
 * every scheduled message (delayed ones included) has been dispatched, which
 * is how the delayed state stabilizes deterministically.
 */
import { costDataPayload, SMALL_ROWS } from './data.js';
import type { HarnessFixture } from './types.js';

/** Fixed delay literal — the only notion of time a fixture may express. */
export const SLOW_DELAY_MS = 1_200;

export const slowFixture: HarnessFixture = {
  id: 'slow',
  surface: 'cost-control',
  description: `Loading state for ${SLOW_DELAY_MS} ms, then the same data as the normal fixture arrives.`,
  initialState: null,
  messages: [
    { data: { type: 'cost-control/loading' } },
    { data: { type: 'cost-control/data', payload: costDataPayload(SMALL_ROWS) }, delayMs: SLOW_DELAY_MS },
  ],
};
