/**
 * Fixture: readOnly — data arrives, but the identity may not change it.
 *
 * `permissions: { canEdit: false, canAnalyze: false }` in the data payload
 * must disable add/edit/AI actions and explain the restriction in a text
 * banner (never color alone). Distinct from `permissionDenied`, where the
 * whole surface is forbidden: here browsing and filtering still work, and no
 * retry is offered for the missing scope because retrying cannot grant it.
 */
import { makeCostRows, sumCost } from './data.js';
import { createWorldResponder } from './responder.js';
import type { HarnessFixture } from './types.js';
import type { CostControlDataPayload } from './protocol.js';

const ROWS = makeCostRows(6, 'cc');
const used = sumCost(ROWS);

const PAYLOAD: CostControlDataPayload = {
  projectId: 'aurora',
  project: 'Aurora Migration',
  currency: 'USD',
  budgetTotal: used * 2,
  budgetUsed: used,
  permissions: { canEdit: false, canAnalyze: false },
  rows: ROWS,
};

const WORLD = {
  projects: [
    {
      id: 'aurora',
      name: 'Aurora Migration',
      currency: 'USD',
      rows: ROWS,
      permissions: { canEdit: false, canAnalyze: false },
    },
  ],
  initialProjectId: 'aurora',
} as const;

export const readOnlyFixture: HarnessFixture = {
  id: 'readOnly',
  surface: 'cost-control',
  description: 'Browsing works, mutations do not: canEdit/canAnalyze are false, so add/edit/AI actions are disabled with a text explanation.',
  initialState: null,
  messages: [{ data: { type: 'cost-control/data', payload: PAYLOAD } }],
  createResponder: () => createWorldResponder(WORLD),
};
