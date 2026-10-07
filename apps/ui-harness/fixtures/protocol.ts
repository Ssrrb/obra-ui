/**
 * Typed message bridge for the cost-control surface.
 *
 * SURFACE_RULES.md: a webview talks to the host only through a typed message
 * bridge, never by reaching into the extension host. These unions are that
 * bridge. Fixtures build the host->webview side; the surface produces the
 * webview->host side through the mocked `postMessage`.
 */

/** One cost line rendered by <obra-data-table>. */
export interface CostRow {
  readonly id: string;
  readonly name: string;
  readonly category: string;
  readonly cost: number;
}

/** Payload of `cost-control/data`. */
export interface CostControlDataPayload {
  readonly project: string;
  readonly currency: string;
  readonly budgetTotal: number;
  readonly budgetUsed: number;
  readonly rows: readonly CostRow[];
}

/** Host -> webview. Delivered by fixtures through the vscode-api mock. */
export type CostControlHostMessage =
  | { readonly type: 'cost-control/loading' }
  | { readonly type: 'cost-control/data'; readonly payload: CostControlDataPayload }
  | { readonly type: 'cost-control/empty'; readonly payload: { readonly message: string } }
  | { readonly type: 'cost-control/error'; readonly payload: { readonly message: string } }
  | { readonly type: 'cost-control/permission-denied'; readonly payload: { readonly message: string } };

/** Webview -> host. Recorded by the mock (`window.__obraHarness.outbound()`). */
export type CostControlWebviewMessage =
  | { readonly type: 'cost-control/ready' }
  | { readonly type: 'cost-control/refresh' }
  | { readonly type: 'cost-control/retry' }
  | { readonly type: 'cost-control/select'; readonly payload: { readonly id: string } };

/** What the real host persists for the webview (`setState` / `getState`). */
export interface CostControlPersistedState {
  readonly selectedId: string | null;
}
