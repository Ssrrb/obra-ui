/**
 * Fixture: oneRow — extreme content, small side (Principle 8).
 *
 * Exactly one cost line: the table, filters ("Showing 1 of 1"), summary, and
 * detail must all render a correct single-row layout, and row navigation keys
 * must be safe at the boundary (ArrowDown on the only row stays put).
 */
import { costDataPayload, ONE_ROW } from './data.js';
import type { HarnessFixture } from './types.js';

export const oneRowFixture: HarnessFixture = {
  id: 'oneRow',
  surface: 'cost-control',
  description: 'Extreme content: a single cost line; verifies single-row layout and navigation boundaries.',
  initialState: null,
  messages: [{ data: { type: 'cost-control/data', payload: costDataPayload(ONE_ROW) } }],
};
