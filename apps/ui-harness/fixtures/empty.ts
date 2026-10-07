/**
 * Fixture: empty — a valid response with zero rows (Principle 8).
 *
 * Distinct from loading: the host answered, there is simply nothing to show.
 * The message carries the copy the empty state must render verbatim.
 */
import type { HarnessFixture } from './types.js';
import { costDataPayload } from './data.js';
import { createWorldResponder } from './responder.js';

export const emptyFixture: HarnessFixture = {
  id: 'empty',
  surface: 'cost-control',
  description: 'The cost service answered with zero rows; the surface shows its empty state.',
  initialState: null,
  messages: [
    {
      data: {
        type: 'cost-control/data',
        payload: costDataPayload([]),
      },
    },
  ],
  createResponder: () => createWorldResponder({ initialProjectId: 'aurora', projects: [{ id: 'aurora', name: 'Aurora Migration', currency: 'USD', rows: [] }] }),
};
