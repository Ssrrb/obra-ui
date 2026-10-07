# Fixtures

A fixture is one deterministic scenario for a surface: an initial persisted
state plus an ordered list of host→webview messages. The harness
(`../src/main.ts`) resolves `?fixture=<id>` against the registry in
`index.ts`, installs the `acquireVsCodeApi` mock with the fixture's
`initialState`, mounts the surface, and schedules the messages.

## Registry

| id                 | module                 | Settles into `data-state` |
|--------------------|------------------------|---------------------------|
| `normal`           | `normal.ts`            | `ready`                   |
| `loading`          | `loading.ts`           | `loading`                 |
| `empty`            | `empty.ts`             | `empty`                   |
| `error`            | `error.ts`             | `error`                   |
| `slow`             | `slow.ts`              | `ready` (after 1200 ms)   |
| `permissionDenied` | `permissionDenied.ts`  | `permission-denied`       |
| `largeDataset`     | `largeDataset.ts`      | `ready` (1000 rows)       |

An unknown `?fixture=` renders a harness error. The registry never falls back
to a default fixture, so a typo cannot silently record the wrong baseline.

## Shape

```ts
// types.ts
interface HarnessFixture {
  id: string;                              // matches ?fixture=
  surface: string;                         // default surface id
  description: string;                     // reviewer context
  initialState: CostControlPersistedState | null;  // getState() at mount
  messages: readonly FixtureMessage[];     // host->webview, in order
}

interface FixtureMessage {
  data: CostControlHostMessage;            // protocol.ts union
  delayMs?: number;                        // fixed delivery delay (default 0)
}
```

The message unions live in `protocol.ts` — the typed bridge required by
`design/SURFACE_RULES.md`. `data.ts` generates the row/budget payloads with
pure arithmetic over the row index.

## Determinism rules

- **No clock, no `Math.random()`, no network.** Time may appear only as a
  fixed `delayMs` literal. Tests never sleep: `whenSettled()` resolves after
  every scheduled message — delayed ones included — has been dispatched, plus
  two animation frames. That is how the `slow` fixture stabilizes.
- **Derived data stays derived.** Budget totals are computed from the rows
  (`costDataPayload`), so table and meter can never disagree.
- **Reset is a re-run, not a repair.** `window.__obraHarness.reset()`
  reinstalls the mock from the same fixture object and remounts the surface,
  producing a byte-identical session. Fixtures are frozen data; nothing may
  mutate them at runtime (the mock structured-clones on every boundary).

## Adding a fixture

1. Create `<id>.ts` exporting a `HarnessFixture` with `id: '<id>'`.
2. Reuse payloads from `data.ts`; extend `protocol.ts` first if the scenario
   needs a new message type (and handle it in the surface).
3. Register it in `index.ts`.
4. Cover it in `tests/visual.spec.ts` and have the baseline reviewed —
   the implementer records, a design reviewer approves (Principle 9).

Every significant surface must at minimum define fixtures for loading, empty,
error, permission-denied, and extreme content (Principle 8).
