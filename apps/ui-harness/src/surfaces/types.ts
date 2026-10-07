/**
 * Surface contract.
 *
 * A surface renders one product UI (SURFACE_RULES.md "Surface identity") from
 * `@obra/ui` components only, driven by the fixture's initial state and
 * host->webview messages. The harness mounts exactly one surface per page.
 *
 * Phase 9 replaces this sample with the real cost-control product surface;
 * the contract below is what every future surface must satisfy.
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
