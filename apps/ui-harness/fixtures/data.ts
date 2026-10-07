/**
 * Deterministic fixture data.
 *
 * Every value here is produced by pure arithmetic over the row index — no
 * clock, no `Math.random()`, no network (fixtures/README.md). Any two runs of
 * any fixture produce byte-identical payloads, which is what makes screenshot
 * diffs meaningful.
 */
import type { CostControlDataPayload, CostItemStatus, CostRow } from './protocol.js';
import { COST_ITEM_STATUSES } from './protocol.js';

const CATEGORIES = ['Compute', 'Storage', 'Network', 'Licenses', 'Labor'] as const;

/**
 * Generate `count` cost rows with a fixed, reproducible formula. `prefix`
 * keeps row ids unique across projects (stable row ids are part of the
 * DataTable contract in ux/cost-control.yaml).
 */
export function makeCostRows(count: number, prefix = 'cc'): readonly CostRow[] {
  const rows: CostRow[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: `${prefix}-${String(i + 1).padStart(4, '0')}`,
      name: `Line item ${i + 1}`,
      category: CATEGORIES[i % CATEGORIES.length],
      status: COST_ITEM_STATUSES[i % COST_ITEM_STATUSES.length],
      cost: 120 + ((i * 37) % 880),
    });
  }
  return rows;
}

/** Total cost of `rows` (pure sum, so budgets stay consistent with the table). */
export function sumCost(rows: readonly CostRow[]): number {
  return rows.reduce((cents, row) => cents + Math.round(row.cost * 100), 0) / 100;
}

/**
 * Wrap rows in the standard `cost-control/data` payload. The budget total is
 * derived from the rows (twice their sum), so the meter deterministically
 * renders at 50% for every dataset size.
 */
export function costDataPayload(
  rows: readonly CostRow[],
  projectId = 'aurora',
  projectName = 'Aurora Migration',
): CostControlDataPayload {
  const used = sumCost(rows);
  return {
    projectId,
    project: projectName,
    currency: 'USD',
    budgetTotal: used * 2,
    budgetUsed: used,
    rows,
  };
}

/** Extreme-content rows: values long enough to force truncation everywhere. */
export function makeLongValueRows(): readonly CostRow[] {
  const longVendor =
    'Consolidated infrastructure vendor agreement covering multi-region compute capacity, ' +
    'premium support escalation, and committed-use discount renegotiation clause '.repeat(3);
  const longCategory = 'Infrastructure & Platform Services (extended contractual category label)';
  return [
    {
      id: 'lv-0001',
      name: longVendor.trim(),
      category: longCategory,
      status: 'approved' satisfies CostItemStatus,
      cost: 1234567,
    },
    {
      id: 'lv-0002',
      name: 'Short name',
      category: 'Compute',
      status: 'pending',
      cost: 250,
    },
    {
      id: 'lv-0003',
      name: `Mixed length ${'appendix '.repeat(30)}`.trim(),
      category: longCategory,
      status: 'flagged',
      cost: 99999,
    },
  ];
}

/** Happy-path dataset: small enough to read in a screenshot. */
export const SMALL_ROWS = makeCostRows(8);

/** Extreme-content dataset (Principle 8): 1000 rows. */
export const LARGE_ROWS = makeCostRows(1000);

/** Extreme-content dataset: very long labels/values. */
export const LONG_VALUE_ROWS = makeLongValueRows();

/** Extreme-content dataset: exactly one row. */
export const ONE_ROW = makeCostRows(1);
