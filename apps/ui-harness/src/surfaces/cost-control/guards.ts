/**
 * Runtime type guards for host->webview messages.
 *
 * The surface trusts nothing that arrives on the `message` channel: every
 * payload is validated before it can touch view state, so unknown or
 * malformed messages are ignored instead of crashing the workspace or —
 * worse — silently changing financial data (ux/cost-control.yaml
 * "malformed_messages").
 */
import type {
  CostAnalysisPayload,
  CostControlDataPayload,
  CostControlProjectsPayload,
  CostRow,
} from '../../../fixtures/protocol.js';
import { COST_ITEM_STATUSES } from '../../../fixtures/protocol.js';

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function isStringArray(value: unknown): value is readonly string[] {
  return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function isCostRow(value: unknown): value is CostRow {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.name === 'string' &&
    typeof value.category === 'string' &&
    COST_ITEM_STATUSES.includes(value.status as never) &&
    isFiniteNumber(value.cost) && value.cost >= 0 && value.cost <= 1e12
  );
}

export function isDataPayload(value: unknown): value is CostControlDataPayload {
  if (!isRecord(value)) return false;
  if (
    typeof value.projectId !== 'string' ||
    typeof value.project !== 'string' ||
    typeof value.currency !== 'string' ||
    !isFiniteNumber(value.budgetTotal) ||
    !isFiniteNumber(value.budgetUsed) ||
    !Array.isArray(value.rows) ||
    !value.rows.every(isCostRow) ||
    value.budgetTotal < 0 || value.budgetUsed < 0 ||
    new Set(value.rows.map((row: CostRow) => row.id)).size !== value.rows.length
  ) {
    return false;
  }
  if (value.permissions !== undefined) {
    if (!isRecord(value.permissions)) return false;
    if (typeof value.permissions.canEdit !== 'boolean' || typeof value.permissions.canAnalyze !== 'boolean') return false;
  }
  return true;
}

export function isProjectsPayload(value: unknown): value is CostControlProjectsPayload {
  if (!isRecord(value)) return false;
  if (typeof value.selectedProjectId !== 'string' || !Array.isArray(value.projects)) return false;
  return value.projects.every(
    (project) => isRecord(project) && typeof project.id === 'string' && typeof project.name === 'string',
  );
}

export function isMessagePayload(value: unknown): value is { message: string } {
  return isRecord(value) && typeof value.message === 'string';
}

export function isAnalysisPayload(value: unknown): value is CostAnalysisPayload {
  if (!isRecord(value)) return false;
  if (
    typeof value.analysisId !== 'string' ||
    typeof value.projectId !== 'string' ||
    typeof value.rationale !== 'string' ||
    !isStringArray(value.sourceItemIds) ||
    value.mock !== true
  ) {
    return false;
  }
  if (!isRecord(value.suggestion)) return false;
  const { suggestion } = value;
  if (
    typeof suggestion.itemId !== 'string' ||
    typeof suggestion.itemName !== 'string' ||
    !isFiniteNumber(suggestion.before) ||
    !isFiniteNumber(suggestion.after) || suggestion.before < 0 || suggestion.after < 0
  ) {
    return false;
  }
  if (!isRecord(value.budgetImpact)) return false;
  const { budgetImpact } = value;
  return (
    isFiniteNumber(budgetImpact.usedBefore) &&
    isFiniteNumber(budgetImpact.usedAfter) &&
    isFiniteNumber(budgetImpact.total) &&
    typeof budgetImpact.currency === 'string'
  );
}
