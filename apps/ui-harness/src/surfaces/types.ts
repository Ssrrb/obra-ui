/**
 * Surface contract.
 *
 * A surface renders one product UI (SURFACE_RULES.md "Surface identity") from
 * `@obra/ui` components only, driven by the fixture's initial state and
 * host->webview messages. The harness mounts exactly one surface per page.
 *
 * The cost-control benchmark workspace (Phase 9, ux/cost-control.yaml) is the
 * reference implementation of this contract.
 */
import type { VsCodeApi } from '../vscode-api.js';

export interface HarnessSurface {
  /** Stable surface id, matched against `?surface=` (e.g. `cost-control`). */
  readonly id: string;
  /**
   * Render into `root` using `api` as the host bridge. Returns a cleanup
   * function that removes every listener the surface added; the harness calls
   * it on reset so no state leaks between runs.
   */
  mount(root: HTMLElement, api: VsCodeApi): () => void;
}
