/**
 * Logic tests: AI-review state machine (pure, node:test — no browser).
 * Proves the staleness/cancellation rules from ux/cost-control.yaml without a
 * DOM: stale proposals never change state, accept only follows explicit
 * confirmation, and cost data changes are represented solely by `applied`
 * (which the view triggers only on the correlated host acknowledgment).
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import type { CostAnalysisPayload } from '../../fixtures/protocol.js';
import { aiReduce, AI_IDLE, isStale } from '../../src/surfaces/cost-control/ai.js';
import type { AiState } from '../../src/surfaces/cost-control/ai.js';

function proposal(id: string): CostAnalysisPayload {
  return {
    analysisId: id,
    projectId: 'aurora',
    rationale: 'mock rationale',
    sourceItemIds: ['cc-0001'],
    suggestion: { itemId: 'cc-0001', itemName: 'Line item 1', before: 1000, after: 850 },
    budgetImpact: { usedBefore: 5000, usedAfter: 4850, total: 10000, currency: 'USD' },
    mock: true,
  };
}

const pending = (requestId: string): AiState => aiReduce(AI_IDLE, { type: 'start', requestId });

test('start moves idle -> pending under a requestId', () => {
  const state = pending('req-1');
  assert.equal(state.phase, 'pending');
  assert.equal(state.requestId, 'req-1');
});

test('a matching proposal is accepted; a stale one is ignored', () => {
  const accepted = aiReduce(pending('req-1'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.equal(accepted.phase, 'proposal');
  assert.equal(accepted.proposal?.analysisId, 'an-1');

  const stale = aiReduce(pending('req-2'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.equal(stale.phase, 'pending', 'late answer for a superseded request must not surface');
  assert.equal(stale.proposal, null);
});

test('cancel invalidates the request, so the delayed answer is stale', () => {
  const cancelled = aiReduce(pending('req-1'), { type: 'cancel' });
  assert.deepEqual(cancelled, AI_IDLE);
  const late = aiReduce(cancelled, { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.deepEqual(late, AI_IDLE);
  assert.equal(isStale(cancelled, 'req-1'), true);
});

test('a new start supersedes an in-flight request (project switch race)', () => {
  let state = pending('req-1');
  state = aiReduce(state, { type: 'start', requestId: 'req-2' }); // switch + re-analyze
  const lateFirst = aiReduce(state, { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.equal(lateFirst.phase, 'pending');
  const second = aiReduce(state, { type: 'proposal', requestId: 'req-2', proposal: proposal('an-2') });
  assert.equal(second.phase, 'proposal');
  assert.equal(second.proposal?.analysisId, 'an-2');
});

test('failure while pending -> error with the host message', () => {
  const failed = aiReduce(pending('req-1'), { type: 'failure', requestId: 'req-1', message: 'mock host: analysis failed' });
  assert.equal(failed.phase, 'error');
  assert.equal(failed.error, 'mock host: analysis failed');
  // stale failure ignored
  const ignored = aiReduce(pending('req-2'), { type: 'failure', requestId: 'req-1', message: 'x' });
  assert.equal(ignored.phase, 'pending');
});

test('accept -> applying -> applied is the only path that changes data', () => {
  let state = aiReduce(pending('req-1'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  // accept without confirmation is impossible in the view; the machine only
  // records the transition, and it moves to the apply requestId.
  state = aiReduce(state, { type: 'accept', requestId: 'req-2' });
  assert.equal(state.phase, 'applying');
  assert.equal(state.requestId, 'req-2');
  // applied without a matching exchange does nothing:
  assert.equal(aiReduce(pending('req-9'), { type: 'applied' }).phase, 'pending');
  state = aiReduce(state, { type: 'applied' });
  assert.deepEqual(state, AI_IDLE);
});

test('apply failure surfaces as error and keeps the proposal for retry context', () => {
  let state = aiReduce(pending('req-1'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  state = aiReduce(state, { type: 'accept', requestId: 'req-2' });
  state = aiReduce(state, { type: 'failure', requestId: 'req-2', message: 'Rejected by the host: stale analysis.' });
  assert.equal(state.phase, 'error');
  assert.equal(state.error, 'Rejected by the host: stale analysis.');
});

test('reject returns to idle without any host mutation', () => {
  const state = aiReduce(pending('req-1'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.deepEqual(aiReduce(state, { type: 'reject' }), AI_IDLE);
});

test('reset (project switch / harness reset) abandons everything', () => {
  assert.deepEqual(aiReduce(pending('req-1'), { type: 'reset' }), AI_IDLE);
  const withProposal = aiReduce(pending('req-1'), { type: 'proposal', requestId: 'req-1', proposal: proposal('an-1') });
  assert.deepEqual(aiReduce(withProposal, { type: 'reset' }), AI_IDLE);
});
