/**
 * Fixture: error — the host reports a failure (Principle 8).
 *
 * The surface must render the error state with the exact message and offer a
 * retry action that posts `cost-control/retry` back through the mock.
 */
import type { HarnessFixture } from './types.js';
import { SMALL_ROWS } from './data.js';
import { createWorldResponder } from './responder.js';

export const errorFixture: HarnessFixture = {
  id: 'error',
  surface: 'cost-control',
  description: 'The cost service failed with HTTP 500; the surface shows its error state with retry.',
  initialState: null,
  messages: [
    {
      data: {
        type: 'cost-control/error',
        payload: { message: 'Cost service responded with HTTP 500.' },
      },
    },
  ],
  createResponder: () => createWorldResponder({ initialProjectId: 'aurora', projects: [{ id: 'aurora', name: 'Aurora Migration', currency: 'USD', rows: SMALL_ROWS }] }),
};
