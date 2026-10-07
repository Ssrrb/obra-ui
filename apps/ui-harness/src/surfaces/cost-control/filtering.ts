/**
 * Pure filtering and aggregation for the cost-control surface.
 *
 * Operates on the semantic rows from the protocol (raw amounts, enum status)
 * — never on formatted display strings. The view derives its table rows from
 * `filterRows` output, so "Showing N of M" and the grid can never disagree.
 */
import type { CostItemStatus, CostRow } from '../../../fixtures/protocol.js';

/** Sentinel option value meaning "no constraint" in a filter select. */
export const ALL = 'all';

export interface CostFilters {
  /** Case-insensitive substring match on row id and name. */
  readonly search: string;
  /** `ALL` or an exact category. */
  readonly category: string;
  /** `ALL` or an exact status. */
  readonly status: string;
}

export const NO_FILTERS: CostFilters = { search: '', category: ALL, status: ALL };

export function isFiltered(filters: CostFilters): boolean {
  return filters.search.trim() !== '' || filters.category !== ALL || filters.status !== ALL;
}

/** True when a single row passes the filters. */
export function rowMatches(row: CostRow, filters: CostFilters): boolean {
  const search = filters.search.trim().toLowerCase();
  if (search !== '' && !row.id.toLowerCase().includes(search) && !row.name.toLowerCase().includes(search)) {
    return false;
  }
  if (filters.category !== ALL && row.category !== filters.category) return false;
  if (filters.status !== ALL && row.status !== filters.status) return false;
  return true;
}

/** Filter rows, preserving order and identity (stable row ids upstream). */
export function filterRows(rows: readonly CostRow[], filters: CostFilters): readonly CostRow[] {
  if (!isFiltered(filters)) return rows;
  return rows.filter((row) => rowMatches(row, filters));
}

/** Distinct categories in first-appearance order — deterministic option lists. */
export function distinctCategories(rows: readonly CostRow[]): readonly string[] {
  const seen: string[] = [];
  for (const row of rows) if (!seen.includes(row.category)) seen.push(row.category);
  return seen;
}

/** Distinct statuses in first-appearance order. */
export function distinctStatuses(rows: readonly CostRow[]): readonly CostItemStatus[] {
  const seen: CostItemStatus[] = [];
  for (const row of rows) if (!seen.includes(row.status)) seen.push(row.status);
  return seen;
}

export interface CategoryTotal {
  readonly category: string;
  readonly total: number;
  readonly count: number;
}

/** Per-category totals over the FULL row set (summaries ignore filters). */
export function categoryTotals(rows: readonly CostRow[]): readonly CategoryTotal[] {
  const totals: CategoryTotal[] = [];
  for (const row of rows) {
    const entry = totals.find((t) => t.category === row.category);
    if (entry) {
      totals[totals.indexOf(entry)] = { ...entry, total: Math.round((entry.total + row.cost) * 100) / 100, count: entry.count + 1 };
    } else {
      totals.push({ category: row.category, total: row.cost, count: 1 });
    }
  }
  return totals;
}
