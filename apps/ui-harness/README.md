# @obra/ui-harness

Fixture-driven browser harness for Obra Studio webview surfaces. It mocks
`acquireVsCodeApi()`, renders `@obra/ui` surfaces from deterministic fixtures
in Chromium, and diffs screenshots against committed baselines.

**Position in the pipeline** (design/PRINCIPLES.md rule 10): Storybook
(`@obra/ui-storybook`) proves components in isolation → **this harness** proves
a whole surface with the host bridge mocked, in a browser → the real Code OSS
fork (`pnpm obra:launch`, `pnpm ui:e2e <flow>`) proves the workflow in the
actual host before merge. The harness is fast feedback, **never the merge
gate**.

## Phase 9 benchmark

The cost-control workspace is the first end-to-end browser benchmark: project
navigation, toolbar, table, filters, editable panels, empty/loading/error states,
keyboard workflows, and deterministic AI proposal review. Start with
`?fixture=multiProject`. See [BENCHMARK.md](./BENCHMARK.md) for the walkthrough,
acceptance matrix, executed checks and outstanding real-host/design gates.

## Prerequisites

The harness does not vendor dependencies. From the workspace root
(`/Users/sebastian/Desktop/obra-studio/ui`):

```sh
pnpm install                    # links @obra/ui (workspace:*), vite, playwright
pnpm --filter @obra/ui build    # the package entry points at dist/
pnpm --filter @obra/ui-harness exec playwright install chromium   # browser binary
```

Missing dependencies must never be worked around by copying code out of
`packages/obra-ui` or hardcoding values.

## Commands

```sh
pnpm dev       # vite dev server on http://127.0.0.1:5173
pnpm build     # production build into dist/
pnpm visual    # all browser specs + visual diffs (approved baselines required)
pnpm test:logic        # Node logic tests, compiled into a temporary directory
pnpm test:interaction  # workflow and mock API checks, no baseline prerequisite
pnpm test:a11y         # automated axe checks
```

Open `http://127.0.0.1:5173/?fixture=error` (etc.) in a browser to inspect a
fixture by hand. If port 5173 is occupied, start `pnpm dev -- --port 5174`
and set `OBRA_HARNESS_PORT=5174` when running Playwright commands.

### URL selection

| Parameter   | Meaning                                                        |
|-------------|----------------------------------------------------------------|
| `?fixture=` | Fixture id from the registry in `fixtures/index.ts`. Default `normal`. An unknown id renders a harness error — it never silently falls back. |
| `?surface=` | Surface id from `src/surfaces/index.ts`. Defaults to the surface the fixture declares. |

## Fixtures

Every fixture is a pure data module (see `fixtures/README.md`): initial
`getState()` value plus an ordered list of host→webview messages, optionally
delayed. No clock reads, no `Math.random()`, no network.

| id                 | What it proves                                                  |
|--------------------|-----------------------------------------------------------------|
| `normal`           | Happy path: data, budget meter, persisted selection via `getState()`. |
| `loading`          | Initial-load state before any data arrives (Principle 8).       |
| `empty`            | Zero-row project; add its first cost item through the responder. |
| `error`            | Failure message; Retry recovers to normal data via the mock host. |
| `slow`             | Delayed success (1200 ms) — the delayed-state stabilization path. |
| `permissionDenied` | Forbidden identity: message without retry (retry cannot grant a scope). |
| `largeDataset`     | Extreme content: 1000 deterministic rows in one message.        |
| `multiProject`     | Three projects; real scope switching against the mock registry. |
| `readOnly`         | Data visible; edit and analysis scopes denied. |
| `oneRow`           | Exactly one row; manual injection/no automatic response. |
| `longValues`       | Long item/category labels; full wrapping values in details. |

Interactive fixtures provide `createResponder()`: isolated mock-host worlds
answer requests with correlated messages through the same scheduler. Mutations
require an acknowledgment; AI proposals require explicit confirmation. Fixtures
without a responder support manual injection and no-response tests.

## The mocked VS Code API

`src/vscode-api.ts` installs a singleton `window.acquireVsCodeApi` **before
any surface code runs**. Like the real host, a second call throws.

- `getState()` / `setState(state)` — backed by a structured clone of the
  fixture's `initialState`; `setState` persists for the page session.
- `postMessage(message)` — recorded in order; read it with
  `window.__obraHarness.outbound()`.
- Host→webview delivery — `injectHostMessage(data)` dispatches a real
  `MessageEvent` on `window`, the exact channel a production webview listens
  on. Surfaces cannot distinguish harness from host.

### `window.__obraHarness`

| Member                        | Purpose                                                  |
|-------------------------------|----------------------------------------------------------|
| `fixtureId` / `surfaceId`     | What the page booted.                                    |
| `outbound()`                  | Recorded webview→host messages, in order.                |
| `state()`                     | Current persisted state.                                 |
| `injectHostMessage(data)`     | Deliver an extra host→webview message immediately.       |
| `whenSettled()`               | Resolves after every scheduled message (delayed included) was dispatched plus two animation frames. Tests await this instead of sleeping. |
| `reset()`                     | Tear down and re-run the fixture from scratch (fresh mock, fresh DOM, empty outbound log). |

## Visual tests and baselines

`tests/visual.spec.ts` iterates every fixture, asserts the settled
`data-state`, and diffs `.obra-cost-control` against
`tests/__screenshots__/chromium/`. Determinism comes from the config:
Chromium-only, pinned viewport/locale/timezone, `reducedMotion: 'reduce'`,
`animations: 'disabled'`, zero pixel-ratio tolerance.

Generate or refresh baselines:

```sh
pnpm --filter @obra/ui-harness exec playwright test visual.spec.ts --update-snapshots
```

Delayed states (`slow`) need no special handling: `whenSettled()` waits out
the fixture's `delayMs` schedule, so the captured frame is a pure function of
the fixture.

**You cannot approve your own baseline** (Principle 9). Record the screenshots,
commit them in a reviewable diff, and a design reviewer accepts or rejects.

## Adding a surface

1. Create `src/surfaces/<id>.ts` exporting a `HarnessSurface`
   (`src/surfaces/types.ts`): `id` + `mount(root, api)` returning a cleanup
   function. Build it **only** from `@obra/ui` custom elements and `--obra-*`
   tokens — no hardcoded colors, spacing, or radii (Principles 3–5), no
   hand-rolled buttons or tables.
2. Register it in `src/surfaces/index.ts`.
3. Give it fixtures in `fixtures/` (at minimum: normal, loading, empty, error,
   permissionDenied — Principle 8) and register them in `fixtures/index.ts`.
4. Add layout classes to `src/harness.css` using tokens only.
5. Add baseline coverage in `tests/visual.spec.ts` and have the baselines
   reviewed.

The real Code OSS flow (`scripts/ui/flows/<id>.mjs`) should wait for the same
stable surface-id class the harness renders (e.g. `.obra-cost-control`), so
host and harness selectors never diverge.

## Layout

```
index.html               # shell: #harness-root + /src/main.ts
playwright.config.ts     # Chromium-only visual config + webServer
vite.config.ts           # plain ESM, no plugins
fixtures/                # deterministic scenarios + registry (fixtures/index.ts)
src/main.ts              # boot: tokens, defineObraUI(), mock install, URL routing
src/vscode-api.ts        # acquireVsCodeApi singleton mock
src/dom.ts               # el() helper — never builds visual components
src/harness.css          # page chrome, tokens only
src/surfaces/            # HarnessSurface implementations + registry
tests/                   # playwright specs (+ __screenshots__ baselines)
```
