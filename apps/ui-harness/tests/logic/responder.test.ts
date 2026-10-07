import test from 'node:test';
import assert from 'node:assert/strict';
import { createWorldResponder } from '../../fixtures/responder.js';
import { SMALL_ROWS, costDataPayload } from '../../fixtures/data.js';
import { isDataPayload } from '../../src/surfaces/cost-control/guards.js';
import type { CostControlHostMessage } from '../../fixtures/protocol.js';

function world(permissions?: { canEdit: boolean; canAnalyze: boolean }) {
  return createWorldResponder({ initialProjectId: 'aurora', projects: [{ id: 'aurora', name: 'Aurora Migration', currency: 'USD', rows: SMALL_ROWS, permissions }] });
}
function answer(responder: ReturnType<typeof world>, type: string, payload: Record<string, unknown>): CostControlHostMessage {
  return responder({ type, payload })![0].data as CostControlHostMessage;
}

test('mock mutations are correlated and preserve fixed budget and stable IDs', () => {
  const responder = world();
  const message = answer(responder, 'cost-control/add-item', { requestId: 'add-1', projectId: 'aurora', item: { name: 'Invoice', category: 'Labor', status: 'pending', cost: 0.1 } });
  assert.equal(message.type, 'cost-control/data');
  if (message.type !== 'cost-control/data') return;
  assert.equal(message.requestId, 'add-1');
  assert.equal(message.payload.rows.length, 9);
  assert.equal(new Set(message.payload.rows.map((row) => row.id)).size, 9);
  assert.equal(message.payload.budgetTotal, costDataPayload(SMALL_ROWS).budgetTotal);
  assert.equal(message.payload.budgetUsed, 1996.1);
});

test('mock host enforces permissions for edit, analysis and apply', () => {
  const responder = world({ canEdit: false, canAnalyze: false });
  assert.equal(answer(responder, 'cost-control/update-item', { requestId: 'edit', projectId: 'aurora', id: 'cc-0001', patch: { cost: 1 } }).type, 'cost-control/error');
  assert.equal(answer(responder, 'cost-control/analyze', { requestId: 'ai', projectId: 'aurora' }).type, 'cost-control/analysis-error');
  assert.equal(answer(responder, 'cost-control/apply-analysis', { requestId: 'apply', projectId: 'aurora', analysisId: 'an-0001' }).type, 'cost-control/error');
});

test('mock host rejects invalid amount/status without changing rows', () => {
  const responder = world();
  for (const patch of [{ cost: -1 }, { cost: 1.001 }, { cost: Infinity }, { status: 'bogus' }, { category: '' }]) {
    assert.equal(answer(responder, 'cost-control/update-item', { requestId: 'bad', projectId: 'aurora', id: 'cc-0001', patch }).type, 'cost-control/error');
  }
  const message = answer(responder, 'cost-control/refresh', { requestId: 'refresh', projectId: 'aurora' });
  if (message.type !== 'cost-control/data') throw new Error('Expected data');
  assert.deepEqual(message.payload.rows, SMALL_ROWS);
});

test('host rejects stale AI proposals after the source item has been edited', () => {
  const responder = world();
  const analysis = answer(responder, 'cost-control/analyze', { requestId: 'ai', projectId: 'aurora' });
  if (analysis.type !== 'cost-control/analysis') throw new Error('Expected analysis');
  answer(responder, 'cost-control/update-item', { requestId: 'edit', projectId: 'aurora', id: analysis.payload.suggestion.itemId, patch: { cost: 500 } });
  const applied = answer(responder, 'cost-control/apply-analysis', { requestId: 'apply', projectId: 'aurora', analysisId: analysis.payload.analysisId });
  assert.equal(applied.type, 'cost-control/error');
});

test('host cancels analyses and consumes accepted proposals once', () => {
  const responder = world();
  const proposal = answer(responder, 'cost-control/analyze', { requestId: 'ai', projectId: 'aurora' });
  if (proposal.type !== 'cost-control/analysis') throw new Error('Expected analysis');
  responder({ type: 'cost-control/cancel-analysis', payload: { requestId: 'ai' } });
  assert.equal(answer(responder, 'cost-control/apply-analysis', { requestId: 'apply', projectId: 'aurora', analysisId: proposal.payload.analysisId }).type, 'cost-control/error');
  const next = answer(responder, 'cost-control/analyze', { requestId: 'ai-2', projectId: 'aurora' });
  if (next.type !== 'cost-control/analysis') throw new Error('Expected analysis');
  assert.equal(answer(responder, 'cost-control/apply-analysis', { requestId: 'apply-2', projectId: 'aurora', analysisId: next.payload.analysisId }).type, 'cost-control/data');
  assert.equal(answer(responder, 'cost-control/apply-analysis', { requestId: 'replay', projectId: 'aurora', analysisId: next.payload.analysisId }).type, 'cost-control/error');
});

test('data guards reject negative costs, duplicate IDs, and malformed permissions', () => {
  const payload = costDataPayload(SMALL_ROWS);
  assert.equal(isDataPayload(payload), true);
  assert.equal(isDataPayload({ ...payload, rows: [{ ...SMALL_ROWS[0], cost: -10 }] }), false);
  assert.equal(isDataPayload({ ...payload, rows: [SMALL_ROWS[0], SMALL_ROWS[0]] }), false);
  assert.equal(isDataPayload({ ...payload, permissions: { canEdit: 'yes', canAnalyze: true } }), false);
});
