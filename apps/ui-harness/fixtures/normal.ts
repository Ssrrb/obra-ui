/**
 * Fixture: normal — the happy path.
 *
 * A persisted selection (`cc-0004`) is rehydrated through `getState()` and a
 * full data message arrives immediately, so the surface renders ready with the
 * selected line item's detail pane.
 */
import { costDataPayload, SMALL_ROWS } from './data.js';
import type { HarnessFixture } from './types.js';

export const normalFixture: HarnessFixture = {
  id: 'normal',
  surface: 'cost-control',
  description: 'Happy path: eight cost lines, budget meter, and a persisted selection rehydrated from getState().',
  initialState: { selectedId: 'cc-0004' },
  messages: [{ data: { type: 'cost-control/data', payload: costDataPayload(SMALL_ROWS) } }],
};
