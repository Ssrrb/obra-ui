/**
 * Surface registry.
 *
 * The harness resolves `?surface=<id>` (default: the fixture's declared
 * surface) against this map. An unknown id renders a harness error — it never
 * falls back to another surface.
 */
import { costControlSurface } from './cost-control.js';
import type { HarnessSurface } from './types.js';

export const surfaces: Readonly<Record<string, HarnessSurface>> = {
  'cost-control': costControlSurface,
};

export type { HarnessSurface } from './types.js';
