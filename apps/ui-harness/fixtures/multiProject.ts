/**
 * Fixture: multiProject — project navigation against a host-backed registry.
 *
 * The host pushes the project list (`cost-control/projects`) plus the first
 * project's data; switching projects posts `cost-control/select-project` and
 * the responder answers with that project's correlated data message, so the
 * displayed scope really changes. `borealis` has 12 rows with `bo-` ids and
 * `ceres` 5 rows with `ce-` ids — distinct, stable row ids per project.
 */
import { costDataPayload, makeCostRows } from './data.js';
import { createWorldResponder } from './responder.js';
import type { HarnessFixture } from './types.js';
import type { ProjectSummary } from './protocol.js';

const AURORA_ROWS = makeCostRows(8, 'cc');
const BOREALIS_ROWS = makeCostRows(12, 'bo');
const CERES_ROWS = makeCostRows(5, 'ce');

export const MULTI_PROJECTS: readonly ProjectSummary[] = [
  { id: 'aurora', name: 'Aurora Migration' },
  { id: 'borealis', name: 'Borealis Platform' },
  { id: 'ceres', name: 'Ceres Analytics' },
];

const WORLD = {
  projects: [
    { id: 'aurora', name: 'Aurora Migration', currency: 'USD', rows: AURORA_ROWS },
    { id: 'borealis', name: 'Borealis Platform', currency: 'USD', rows: BOREALIS_ROWS },
    { id: 'ceres', name: 'Ceres Analytics', currency: 'USD', rows: CERES_ROWS },
  ],
  initialProjectId: 'aurora',
} as const;

export const multiProjectFixture: HarnessFixture = {
  id: 'multiProject',
  surface: 'cost-control',
  description: 'Three-project registry: project switching, refresh, add/edit saves, and the mock AI flow all answer deterministically.',
  initialState: { selectedId: null, projectId: 'aurora', section: 'items' },
  messages: [
    {
      data: {
        type: 'cost-control/projects',
        payload: { projects: MULTI_PROJECTS, selectedProjectId: 'aurora' },
      },
    },
    { data: { type: 'cost-control/data', payload: costDataPayload(AURORA_ROWS, 'aurora', 'Aurora Migration') } },
  ],
  createResponder: () => createWorldResponder(WORLD),
};
