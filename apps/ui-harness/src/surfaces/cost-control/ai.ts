/**
 * Pure AI-review state machine for the cost-control surface.
 *
 * All staleness rules live here so they are testable under node without a
 * browser (ux/cost-control.yaml "ai_behavior"):
 * - a proposal/error answer is accepted ONLY while its requestId matches the
 *   active request; anything else (late answer after cancel, answer for a
 *   previous project, replayed message) leaves the state unchanged,
 * - cancel invalidates the active request, so the delayed fixture answer
 *   that still arrives is stale by construction,
 * - cost data itself never changes in this machine — acceptance only moves
 *   `proposal -> applying`; the actual change happens when the correlated
 *   data acknowledgment arrives (`applied`).
 */
import type { CostAnalysisPayload } from '../../../fixtures/protocol.js';

export type AiPhase = 'idle' | 'pending' | 'proposal' | 'applying' | 'error';

export interface AiState {
  readonly phase: AiPhase;
  /** requestId of the active analyze/apply exchange; null invalidates all answers. */
  readonly requestId: string | null;
  readonly proposal: CostAnalysisPayload | null;
  readonly error: string | null;
}

export const AI_IDLE: AiState = { phase: 'idle', requestId: null, proposal: null, error: null };

export type AiEvent =
  | { readonly type: 'start'; readonly requestId: string }
  | { readonly type: 'cancel' }
  | { readonly type: 'proposal'; readonly requestId: string; readonly proposal: CostAnalysisPayload }
  | { readonly type: 'failure'; readonly requestId: string; readonly message: string }
  | { readonly type: 'accept'; readonly requestId: string }
  | { readonly type: 'applied' }
  | { readonly type: 'reject' }
  | { readonly type: 'reset' };

/** True when an answer for `requestId` must be ignored. */
export function isStale(state: AiState, requestId: string | null | undefined): boolean {
  return state.requestId === null || requestId == null || state.requestId !== requestId;
}

export function aiReduce(state: AiState, event: AiEvent): AiState {
  switch (event.type) {
    case 'start':
      // Starting from any phase supersedes the previous request: its answers
      // become stale automatically because the requestId no longer matches.
      return { phase: 'pending', requestId: event.requestId, proposal: null, error: null };
    case 'cancel':
      return AI_IDLE;
    case 'proposal':
      if (state.phase !== 'pending' || isStale(state, event.requestId)) return state;
      return { phase: 'proposal', requestId: event.requestId, proposal: event.proposal, error: null };
    case 'failure':
      // A failure ends the pending analysis OR a rejected/failed apply —
      // both keep cost data unchanged and offer Retry.
      if ((state.phase !== 'pending' && state.phase !== 'applying') || isStale(state, event.requestId)) return state;
      return { phase: 'error', requestId: event.requestId, proposal: state.phase === 'applying' ? state.proposal : null, error: event.message };
    case 'accept':
      // Explicit Accept was confirmed in the dialog; the apply exchange
      // continues under the apply requestId so its answers correlate.
      if (state.phase !== 'proposal' || !state.proposal) return state;
      return { ...state, phase: 'applying', requestId: event.requestId };
    case 'applied':
      // Correlated data message arrived — the host acknowledged the change.
      if (state.phase !== 'applying') return state;
      return AI_IDLE;
    case 'reject':
      if (state.phase !== 'proposal') return state;
      return AI_IDLE;
    case 'reset':
      // Project switch / harness reset: everything in flight is abandoned.
      return AI_IDLE;
  }
}
