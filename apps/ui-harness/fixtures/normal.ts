/**
 * Fixture: normal — the happy path.
 *
 * A persisted selection (`cc-0004`) is rehydrated through `getState()` and a
 * full data message arrives immediately, so the surface renders ready with the
 * selected line item's detail pane. Interactive: the responder answers
 * refresh/add/update/analyze requests against a single-project world, so this
 * fixture also drives the mutation and AI tests.
 */
import { costDataPayload, SMALL_ROWS } from './data.js';
import { createWorldResponder } from './responder.js';
import type { HarnessFixture } from './types.js';

const WORLD = {
  projects: [
    { id: 'aurora', name: 'Aurora Migration', currency: 'USD', rows: SMALL_ROWS },
  ],
  initialProjectId: 'aurora',
} as const;

export const normalFixture: HarnessFixture = {
  id: 'normal',
  surface: 'cost-control',
  description: 'Happy path: eight cost lines, budget meter, and a persisted selection rehydrated from getState().',
  initialState: { selectedId: 'cc-0004' },
  messages: [{ data: { type: 'cost-control/data', payload: costDataPayload(SMALL_ROWS) } }],
  createResponder: () => createWorldResponder(WORLD),
};
