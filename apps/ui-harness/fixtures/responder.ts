/**
 * Deterministic mock-host responder for interactive fixtures (Phase 9).
 *
 * `createWorldResponder(world)` returns a `FixtureResponder`: a pure function
 * from webview->host messages to scheduled host->webview replies, over a
 * mutable in-memory "world" that stands in for the real cost service. Rules:
 *
 * - No clock reads, no `Math.random()`, no network (fixtures/README.md). The
 *   only notion of time is the fixed `ANALYSIS_DELAY_MS` literal, so the AI
 *   pending state is observable and `whenSettled()` stays deterministic.
 * - Every correlated reply echoes the request's `requestId`, which is how the
 *   surface proves it ignores stale answers (ux/cost-control.yaml).
 * - The world re-validates mutations server-side: an invalid add/update is
 *   answered with a correlated `cost-control/error`, never applied.
 * - Mutations succeed by replying with fresh `cost-control/data` — the data
 *   message IS the host acknowledgment; the surface changes financial data
 *   only when it arrives.
 */
import type {
  CostAnalysisPayload,
  CostControlDataPayload,
  CostItemDraft,
  CostRow,
} from './protocol.js';
import { COST_ITEM_STATUSES } from './protocol.js';
import { sumCost } from './data.js';
import type { FixtureMessage, FixtureResponder } from './types.js';

/** One project the mock host serves. Rows are copied into the world. */
export interface WorldProject {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  readonly rows: readonly CostRow[];
  /** Absent = full access. */
  readonly permissions?: { readonly canEdit: boolean; readonly canAnalyze: boolean };
}

export interface MockWorld {
  readonly projects: readonly WorldProject[];
  readonly initialProjectId: string;
}

/** Fixed latency of the AI answer — a literal, never a clock read. */
export const ANALYSIS_DELAY_MS = 300;

/** Deterministic suggestion: cut the most expensive line to 85%. */
const AI_CUT_FACTOR = 0.85;

interface MutableProject {
  readonly id: string;
  readonly name: string;
  readonly currency: string;
  rows: CostRow[];
  permissions?: { canEdit: boolean; canAnalyze: boolean };
  nextRowNumber: number;
  readonly budgetTotal: number;
}

interface PendingAnalysis {
  readonly analysisId: string;
  readonly requestId: string;
  readonly projectId: string;
  readonly itemId: string;
  readonly before: number;
  readonly after: number;
  readonly cancelled: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function payloadOf(message: Record<string, unknown>): Record<string, unknown> | null {
  return isRecord(message.payload) ? message.payload : null;
}

function createDataMessage(project: MutableProject, requestId?: string): FixtureMessage {
  const used = sumCost(project.rows);
  const payload: CostControlDataPayload = {
    projectId: project.id,
    project: project.name,
    currency: project.currency,
    budgetTotal: project.budgetTotal,
    budgetUsed: used,
    ...(project.permissions ? { permissions: project.permissions } : {}),
    rows: project.rows,
  };
  return {
    data: requestId
      ? { type: 'cost-control/data', requestId, payload }
      : { type: 'cost-control/data', payload },
  };
}

function errorMessage(requestId: string, message: string): FixtureMessage {
  return { data: { type: 'cost-control/error', requestId, payload: { message } } };
}

function validAmount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= 1e12 && Math.abs(value * 100 - Math.round(value * 100)) < 0.001;
}

function isValidDraft(draft: unknown): draft is CostItemDraft {
  if (!isRecord(draft)) return false;
  return (
    typeof draft.name === 'string' &&
    draft.name.trim().length > 0 && draft.name.trim().length <= 300 &&
    typeof draft.category === 'string' &&
    draft.category.length > 0 &&
    COST_ITEM_STATUSES.includes(draft.status as never) &&
    validAmount(draft.cost)
  );
}

/**
 * Build the responder. The world snapshot is deep-copied per call, so
 * `fixture.createResponder()` on every harness run/reset starts from the
 * fixture's frozen data (fixtures/README.md: "reset is a re-run").
 */
export function createWorldResponder(world: MockWorld): FixtureResponder {
  const projects: MutableProject[] = world.projects.map((project) => ({
    id: project.id,
    name: project.name,
    currency: project.currency,
    rows: project.rows.map((row) => ({ ...row })),
    ...(project.permissions ? { permissions: { ...project.permissions } } : {}),
    nextRowNumber: project.rows.length + 1,
    budgetTotal: sumCost(project.rows) * 2,
  }));
  const byId = new Map(projects.map((project) => [project.id, project]));
  let analysis: PendingAnalysis | null = null;
  let analysisCounter = 0;

  function projectFor(projectId: unknown): MutableProject | null {
    const project = typeof projectId === 'string' ? byId.get(projectId) : undefined;
    return project ?? null;
  }

  return function respond(message: unknown): readonly FixtureMessage[] | undefined {
    if (!isRecord(message) || typeof message.type !== 'string') return undefined;
    const payload = payloadOf(message);

    switch (message.type) {
      case 'cost-control/refresh':
      case 'cost-control/retry':
      case 'cost-control/select-project': {
        if (!payload) return undefined;
        const requestId = String(payload.requestId ?? '');
        const project = projectFor(payload.projectId);
        if (!project) return [errorMessage(requestId, `Unknown project "${String(payload.projectId)}".`)];
        return [createDataMessage(project, requestId)];
      }

      case 'cost-control/add-item': {
        if (!payload) return undefined;
        const requestId = String(payload.requestId ?? '');
        const project = projectFor(payload.projectId);
        if (!project) return [errorMessage(requestId, `Unknown project "${String(payload.projectId)}".`)];
        if (!project.permissions?.canEdit && project.permissions !== undefined) {
          return [errorMessage(requestId, 'Rejected by the host: the obra.cost.write scope is missing.')];
        }
        if (!isValidDraft(payload.item)) {
          return [errorMessage(requestId, 'Rejected by the host: name, category, status, or amount is invalid.')];
        }
        const draft = payload.item;
        const id = `${project.id.slice(0, 2)}-${String(project.nextRowNumber).padStart(4, '0')}`;
        project.nextRowNumber += 1;
        project.rows = [...project.rows, { id, name: draft.name.trim(), category: draft.category, status: draft.status, cost: draft.cost }];
        return [createDataMessage(project, requestId)];
      }

      case 'cost-control/update-item': {
        if (!payload) return undefined;
        const requestId = String(payload.requestId ?? '');
        const project = projectFor(payload.projectId);
        if (!project) return [errorMessage(requestId, `Unknown project "${String(payload.projectId)}".`)];
        if (!project.permissions?.canEdit && project.permissions !== undefined) {
          return [errorMessage(requestId, 'Rejected by the host: the obra.cost.write scope is missing.')];
        }
        const patch = isRecord(payload.patch) ? payload.patch : null;
        const index = project.rows.findIndex((row) => row.id === payload.id);
        if (!patch || index < 0) {
          return [errorMessage(requestId, `Rejected by the host: unknown item "${String(payload.id)}".`)];
        }
        if (patch.cost !== undefined && !validAmount(patch.cost)) {
          return [errorMessage(requestId, 'Rejected by the host: amount is invalid.')];
        }
        if (patch.name !== undefined && (typeof patch.name !== 'string' || patch.name.trim().length === 0 || patch.name.trim().length > 300)) {
          return [errorMessage(requestId, 'Rejected by the host: name must not be empty.')];
        }
        if ((patch.category !== undefined && (typeof patch.category !== 'string' || patch.category.trim() === '')) ||
            (patch.status !== undefined && !COST_ITEM_STATUSES.includes(patch.status as never))) {
          return [errorMessage(requestId, 'Rejected by the host: category or status is invalid.')];
        }
        const current = project.rows[index];
        const next: CostRow = {
          id: current.id,
          name: typeof patch.name === 'string' ? patch.name.trim() : current.name,
          category: typeof patch.category === 'string' ? patch.category : current.category,
          status: COST_ITEM_STATUSES.includes(patch.status as never) ? (patch.status as CostRow['status']) : current.status,
          cost: typeof patch.cost === 'number' ? patch.cost : current.cost,
        };
        project.rows = project.rows.map((row, i) => (i === index ? next : row));
        return [createDataMessage(project, requestId)];
      }

      case 'cost-control/analyze': {
        if (!payload) return undefined;
        const requestId = String(payload.requestId ?? '');
        const project = projectFor(payload.projectId);
        if (!project) return [errorMessage(requestId, `Unknown project "${String(payload.projectId)}".`)];
        if (project.permissions?.canAnalyze === false) {
          return [{ data: { type: 'cost-control/analysis-error', requestId, payload: { message: 'The obra.cost.analyze scope is missing.' } } }];
        }
        analysisCounter += 1;
        const analysisId = `an-${String(analysisCounter).padStart(4, '0')}`;
        const rows = project.rows;
        if (rows.length === 0) {
          return [
            {
              data: {
                type: 'cost-control/analysis-error',
                requestId,
                payload: { message: 'No cost lines to analyze in this project.' },
              },
            },
          ];
        }
        // Deterministic pick: first row with the maximum cost (stable under ties).
        let target = rows[0];
        for (const row of rows) if (row.cost > target.cost) target = row;
        const after = Math.round(target.cost * AI_CUT_FACTOR * 100) / 100;
        analysis = { analysisId, requestId, projectId: project.id, itemId: target.id, before: target.cost, after, cancelled: false };
        const usedBefore = sumCost(rows);
        const analysisPayload: CostAnalysisPayload = {
          analysisId,
          projectId: project.id,
          rationale:
            `Mock benchmark analysis: "${target.name}" (${target.category}) is the most expensive line ` +
            `of ${project.name}. The deterministic mock suggests reducing it to 85% of its current amount, ` +
            'which the fixture world treats as a renegotiated vendor rate.',
          sourceItemIds: [target.id],
          suggestion: { itemId: target.id, itemName: target.name, before: target.cost, after },
          budgetImpact: {
            usedBefore,
            usedAfter: Math.round((usedBefore - target.cost + after) * 100) / 100,
            total: project.budgetTotal,
            currency: project.currency,
          },
          mock: true,
        };
        return [{ data: { type: 'cost-control/analysis', requestId, payload: analysisPayload }, delayMs: ANALYSIS_DELAY_MS }];
      }

      case 'cost-control/cancel-analysis': {
        if (!payload) return undefined;
        // The host acknowledges cancellation by silence; marking the pending
        // analysis cancelled makes a late apply-analysis fail deterministically.
        if (analysis && analysis.requestId === String(payload.requestId ?? '')) {
          analysis = { ...analysis, cancelled: true };
        }
        return [];
      }

      case 'cost-control/apply-analysis': {
        if (!payload) return undefined;
        const requestId = String(payload.requestId ?? '');
        const project = projectFor(payload.projectId);
        if (!project) return [errorMessage(requestId, `Unknown project "${String(payload.projectId)}".`)];
        if (project.permissions?.canEdit === false || project.permissions?.canAnalyze === false) {
          return [errorMessage(requestId, 'The write or analysis permission is missing; costs unchanged.')];
        }
        if (!analysis || analysis.cancelled || analysis.analysisId !== payload.analysisId || analysis.projectId !== project.id) {
          return [errorMessage(requestId, 'Rejected by the host: the analysis is unknown, stale, or cancelled.')];
        }
        // Capture before clearing: closures over the mutable `analysis`
        // binding would lose the narrowing.
        const applied = analysis;
        const index = project.rows.findIndex((row) => row.id === applied.itemId);
        if (index < 0 || project.rows[index].cost !== applied.before) return [errorMessage(requestId, 'Rejected by the host: the suggested item changed. Analyze again.')];
        analysis = null;
        project.rows = project.rows.map((row, i) => (i === index ? { ...row, cost: applied.after } : row));
        return [createDataMessage(project, requestId)];
      }

      default:
        // cost-control/ready, cost-control/select, unknown messages: no answer.
        return undefined;
    }
  };
}
