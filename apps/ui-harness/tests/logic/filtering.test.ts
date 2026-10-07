/**
 * Logic tests: filtering + aggregation (pure, node:test — no browser).
 * Run instructions: apps/ui-harness/README.md ("Logic tests").
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CostRow } from '../../fixtures/protocol.js';
import {
  ALL,
  categoryTotals,
  distinctCategories,
  distinctStatuses,
  filterRows,
  isFiltered,
  NO_FILTERS,
  rowMatches,
} from '../../src/surfaces/cost-control/filtering.js';

function row(id: string, name: string, category: string, status: CostRow['status'], cost: number): CostRow {
  return { id, name, category, status, cost };
}

const ROWS: readonly CostRow[] = [
  row('cc-0001', 'Line item 1', 'Compute', 'approved', 120),
  row('cc-0002', 'Line item 2', 'Storage', 'pending', 157),
  row('cc-0003', 'Backup Storage', 'Storage', 'flagged', 194),
  row('cc-0004', 'Line item 4', 'Network', 'approved', 231),
];

test('NO_FILTERS returns every row and is not "filtered"', () => {
  assert.equal(isFiltered(NO_FILTERS), false);
  assert.equal(filterRows(ROWS, NO_FILTERS), ROWS); // identity, not a copy
});

test('search matches id and name (not category), case-insensitively, trimmed', () => {
  assert.deepEqual(filterRows(ROWS, { ...NO_FILTERS, search: 'storage' }).map((r) => r.id), ['cc-0003']);
  assert.deepEqual(filterRows(ROWS, { ...NO_FILTERS, search: ' CC-0004 ' }).map((r) => r.id), ['cc-0004']);
  assert.deepEqual(filterRows(ROWS, { ...NO_FILTERS, search: 'zzz' }), []);
  assert.equal(isFiltered({ ...NO_FILTERS, search: 'a' }), true);
});

test('category and status filters combine with search', () => {
  assert.deepEqual(filterRows(ROWS, { ...NO_FILTERS, category: 'Storage' }).map((r) => r.id), ['cc-0002', 'cc-0003']);
  assert.deepEqual(
    filterRows(ROWS, { search: 'backup', category: 'Storage', status: 'flagged' }).map((r) => r.id),
    ['cc-0003'],
  );
  assert.deepEqual(filterRows(ROWS, { search: '', category: 'Storage', status: 'approved' }), []);
  assert.equal(rowMatches(ROWS[0], { search: '', category: ALL, status: ALL }), true);
});

test('distinct option lists keep first-appearance order', () => {
  assert.deepEqual(distinctCategories(ROWS), ['Compute', 'Storage', 'Network']);
  assert.deepEqual(distinctStatuses(ROWS), ['approved', 'pending', 'flagged']);
});

test('categoryTotals sums raw semantic amounts, not display strings', () => {
  assert.deepEqual(categoryTotals(ROWS), [
    { category: 'Compute', total: 120, count: 1 },
    { category: 'Storage', total: 351, count: 2 },
    { category: 'Network', total: 231, count: 1 },
  ]);
});
