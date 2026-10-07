/**
 * Fixture: largeDataset — extreme content (Principle 8).
 *
 * 1000 deterministic rows in a single data message. This proves the table
 * renders a large payload without freezing the harness and gives the visual
 * baseline an extreme-content frame; the table scrolls inside its own pane, so
 * the element screenshot keeps a stable size.
 */
import { costDataPayload, LARGE_ROWS } from './data.js';
import type { HarnessFixture } from './types.js';

export const largeDatasetFixture: HarnessFixture = {
  id: 'largeDataset',
  surface: 'cost-control',
  description: 'Extreme content: 1000 generated cost lines delivered in one data message.',
  initialState: { selectedId: 'cc-0500' },
  messages: [{ data: { type: 'cost-control/data', payload: costDataPayload(LARGE_ROWS) } }],
};
