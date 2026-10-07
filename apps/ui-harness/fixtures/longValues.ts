/**
 * Fixture: longValues — extreme content, long labels (Principle 8).
 *
 * Names and categories far beyond the cell width: table cells truncate with a
 * title tooltip (DataTable built-in), while the detail pane shows the FULL
 * value in a wrapping text block so nothing is unreachable in a narrow
 * layout.
 */
import { costDataPayload, LONG_VALUE_ROWS } from './data.js';
import type { HarnessFixture } from './types.js';

export const longValuesFixture: HarnessFixture = {
  id: 'longValues',
  surface: 'cost-control',
  description: 'Extreme content: very long line-item names and category labels; truncation in the table, full values in the detail pane.',
  initialState: { selectedId: 'lv-0001' },
  messages: [
    {
      data: {
        type: 'cost-control/data',
        payload: costDataPayload(LONG_VALUE_ROWS, 'aurora', 'Aurora Migration'),
      },
    },
  ],
};
