/**
 * Typed message bridge for the cost-control surface.
 *
 * SURFACE_RULES.md: a webview talks to the host only through a typed message
 * bridge, never by reaching into the extension host. These unions are that
 * bridge. Fixtures build the host->webview side; the surface produces the
 * webview->host side through the mocked `postMessage`.
 *
 * Phase 9 extensions (ux/cost-control.yaml):
 * - every mutating request carries a `requestId`; correlated host answers
 *   echo it so the surface can ignore stale responses (project switches,
 *   cancellation, refresh races). Answers WITHOUT a requestId are
 *   uncorrelated pushes — always accepted, which keeps the Phase 6 fixtures
 *   and manual-injection tests working unchanged.
 * - cost rows carry a semantic `status`; display formatting (currency) is
 *   derived at render time only, never stored here.
 * - AI analysis messages are explicitly mock-labeled (`mock: true`).
 */

/** Lifecycle status of one cost line (semantic value, not a color). */
export type CostItemStatus = 'approved' | 'pending' | 'flagged';

/** Every status in display order. */
export const COST_ITEM_STATUSES: readonly CostItemStatus[] = ['approved', 'pending', 'flagged'];

/** One cost line rendered by <obra-data-table>. */
export interface CostRow {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly status: CostItemStatus;
  /** Raw semantic amount in the payload currency. Never a formatted string. */
  readonly cost: number;
}

/** What the signed-in identity may do in one project. Absent = full access. */
export interface CostControlPermissions {
  readonly canEdit: boolean;
  readonly canAnalyze: boolean;
}

/** One entry of the host-backed project registry. */
export interface ProjectSummary {
  readonly id: string;
  readonly name: string;
}

/** Payload of `cost-control/data`. */
export interface CostControlDataPayload {
  readonly projectId: string;
  /** Display name of the project. */
  readonly project: string;
  readonly currency: string;
  readonly budgetTotal: number;
  readonly budgetUsed: number;
  /** Absent means full access (Phase 6 payloads predate permissions). */
  readonly permissions?: CostControlPermissions;
  readonly rows: readonly CostRow[];
}

/** Payload of `cost-control/projects`. */
export interface CostControlProjectsPayload {
  readonly projects: readonly ProjectSummary[];
  readonly selectedProjectId: string;
}

/** The one deterministic suggestion of `cost-control/analysis`. */
export interface AnalysisSuggestion {
  readonly itemId: string;
  readonly itemName: string;
  /** Raw amounts, semantic — formatting happens in the view. */
  readonly before: number;
  readonly after: number;
}

/** Payload of `cost-control/analysis`. Always mock output, never real AI. */
export interface CostAnalysisPayload {
  readonly analysisId: string;
  readonly projectId: string;
  readonly rationale: string;
  readonly sourceItemIds: readonly string[];
  readonly suggestion: AnalysisSuggestion;
  readonly budgetImpact: {
    readonly usedBefore: number;
    readonly usedAfter: number;
    readonly total: number;
    readonly currency: string;
  };
  /** Always true: benchmark output of the deterministic fixture responder. */
  readonly mock: true;
}

/** Payload of `cost-control/add-item`. */
export interface CostItemDraft {
  readonly name: string;
  readonly category: string;
  readonly status: CostItemStatus;
  readonly cost: number;
}

/** Host -> webview. Delivered by fixtures through the vscode-api mock. */
export type CostControlHostMessage =
  | { readonly type: 'cost-control/loading'; readonly requestId?: string }
  | { readonly type: 'cost-control/projects'; readonly payload: CostControlProjectsPayload }
  | { readonly type: 'cost-control/data'; readonly requestId?: string; readonly payload: CostControlDataPayload }
  | { readonly type: 'cost-control/empty'; readonly requestId?: string; readonly payload: { readonly message: string } }
  | { readonly type: 'cost-control/error'; readonly requestId?: string; readonly payload: { readonly message: string } }
  | { readonly type: 'cost-control/permission-denied'; readonly payload: { readonly message: string } }
  | { readonly type: 'cost-control/analysis'; readonly requestId: string; readonly payload: CostAnalysisPayload }
  | { readonly type: 'cost-control/analysis-error'; readonly requestId: string; readonly payload: { readonly message: string } };

/** Webview -> host. Recorded by the mock (`window.__obraHarness.outbound()`). */
export type CostControlWebviewMessage =
  | { readonly type: 'cost-control/ready' }
  | { readonly type: 'cost-control/refresh'; readonly payload: { readonly requestId: string; readonly projectId: string } }
  | { readonly type: 'cost-control/retry'; readonly payload: { readonly requestId: string; readonly projectId: string } }
  | { readonly type: 'cost-control/select-project'; readonly payload: { readonly requestId: string; readonly projectId: string } }
  | { readonly type: 'cost-control/select'; readonly payload: { readonly id: string } }
  | { readonly type: 'cost-control/add-item'; readonly payload: { readonly requestId: string; readonly projectId: string; readonly item: CostItemDraft } }
  | { readonly type: 'cost-control/update-item'; readonly payload: { readonly requestId: string; readonly projectId: string; readonly id: string; readonly patch: Partial<CostItemDraft> } }
  | { readonly type: 'cost-control/analyze'; readonly payload: { readonly requestId: string; readonly projectId: string } }
  | { readonly type: 'cost-control/cancel-analysis'; readonly payload: { readonly requestId: string } }
  | { readonly type: 'cost-control/apply-analysis'; readonly payload: { readonly requestId: string; readonly analysisId: string; readonly projectId: string } };

/**
 * What the real host persists for the webview (`setState` / `getState`).
 * Phase 6 shape (`{ selectedId }`) remains valid: every Phase 9 field is
 * optional and defaults when missing.
 */
export interface CostControlPersistedState {
  readonly selectedId: string | null;
  readonly projectId?: string | null;
  /** Active section id: `items` | `summary` | `ai`. */
  readonly section?: string | null;
}
