/**
 * Fixture: permissionDenied — authorized request, forbidden identity.
 *
 * SURFACE_RULES.md requires the permission-denied state to render before any
 * data arrives. Distinct from `error`: there is no retry (retrying cannot grant
 * the missing scope), only the message and the way to obtain access.
 */
import type { HarnessFixture } from './types.js';

export const permissionDeniedFixture: HarnessFixture = {
  id: 'permissionDenied',
  surface: 'cost-control',
  description: 'The account lacks the obra.cost.read scope; the surface shows a permission-denied state without retry.',
  initialState: null,
  messages: [
    {
      data: {
        type: 'cost-control/permission-denied',
        payload: { message: 'Your account lacks the obra.cost.read scope for this project. Contact the project administrator to request access.' },
      },
    },
  ],
};
