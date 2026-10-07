/**
 * Fixture: loading — the initial-load state (Principle 8).
 *
 * No state is persisted and the only host message is `cost-control/loading`,
 * so the surface stays in its loading state indefinitely. This is what a user
 * sees before any data arrives.
 */
import type { HarnessFixture } from './types.js';

export const loadingFixture: HarnessFixture = {
  id: 'loading',
  surface: 'cost-control',
  description: 'Initial load: the surface shows its loading state and no data ever arrives.',
  initialState: null,
  messages: [{ data: { type: 'cost-control/loading' } }],
};
