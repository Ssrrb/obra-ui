/**
 * Deterministic fixture data.
 *
 * Every value here is produced by pure arithmetic over the row index — no
 * clock, no `Math.random()`, no network (fixtures/README.md). Any two runs of
 * any fixture produce byte-identical payloads, which is what makes screenshot
 * diffs meaningful.
 */
import type { CostControlDataPayload, CostRow } from './protocol.js';

const CATEGORIES = ['Compute', 'Storage', 'Network', 'Licenses', 'Labor'] as const;

/** Generate `count` cost rows with a fixed, reproducible formula. */
export function makeCostRows(count: number): readonly CostRow[] {
  const rows: CostRow[] = [];
  for (let i = 0; i < count; i += 1) {
    rows.push({
      id: `cc-${String(i + 1).padStart(4, '0')}`,
      name: `Line item ${i + 1}`,
      category: CATEGORIES[i % CATEGORIES.length],
      cost: 120 + ((i * 37) % 880),
    });
  }
  return rows;
}

/** Total cost of `rows` (pure sum, so budgets stay consistent with the table). */
export function sumCost(rows: readonly CostRow[]): number {
  return rows.reduce((total, row) => total + row.cost, 0);
}

/**
 * Wrap rows in the standard `cost-control/data` payload. The budget total is
 * derived from the rows (twice their sum), so the meter deterministically
 * renders at 50% for every dataset size.
 */
export function costDataPayload(rows: readonly CostRow[]): CostControlDataPayload {
  const used = sumCost(rows);
  return {
    project: 'Aurora Migration',
    currency: 'USD',
    budgetTotal: used * 2,
    budgetUsed: used,
    rows,
  };
}

/** Happy-path dataset: small enough to read in a screenshot. */
export const SMALL_ROWS = makeCostRows(8);

/** Extreme-content dataset (Principle 8): 1000 rows. */
export const LARGE_ROWS = makeCostRows(1000);
