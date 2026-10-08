# @obra/ui-storybook

Storybook is the **executable design system** for `@obra/ui`: every primitive,
pattern, and layout rendered in every state and all three themes. It is fast
feedback for design review, **not** the merge gate — important workflows still
run in the real Code OSS host (design/PRINCIPLES.md rule 10).

- Stories live with the components: `packages/obra-ui/stories/<component>.stories.ts`
- Story titles match `design/penpot-map.json` (e.g. `Primitives/Button`,
  `Patterns/DataTable`, `Layouts/Stack`)
- The workbench config lives here: `.storybook/main.ts`, `.storybook/preview.ts`,
  `.storybook/preview.css`
- The **VS Code workbench replica** (`Workbench/*` stories) lives here too:
  `src/workbench/` builds the chrome and `stories/` assembles it. See
  [Workbench replica](#workbench-replica) below and `design/README.md`.

## First-time setup

Dependencies are **not** installed in this repository and there is no network
access inside CI sandboxes. Run the workspace install once before the first run:

```bash
pnpm install
```

This resolves the `workspace:*` dependency on `@obra/ui` and installs Storybook,
`@storybook/addon-a11y`, `@storybook/addon-themes`, `axe-core`, and Playwright
as listed in `package.json`.

## Run

From the repository root:

```bash
pnpm ui:storybook        # Storybook dev server on http://localhost:6006
pnpm --filter @obra/ui-storybook build-storybook   # static build -> storybook-static/
```

`pnpm ui:storybook` routes to this package's `storybook` script.

## Workbench replica (`Workbench/*`)

The `Workbench/*` stories are a **VS Code workbench replica**: a token-driven
reproduction of the Code OSS chrome (title bar, activity bar, primary side bar,
editor group with tabs and breadcrumbs, bottom panel, Chat auxiliary bar,
status bar) that hosts `@obra/ui` surfaces for design and UX review in a
browser. It is the testing interface `ui/screens/` and `ui/previews/` design
against.

| Story | What it is |
|---|---|
| `Workbench/Shell` | The chrome alone: empty explorer, neutral editor, optional panel / Chat, activity labels, all three themes |
| `Workbench/Company` | Company view (CV-01 Proyectos): activity bar, empty explorer, projects editor, Chat, status bar — plus loading / empty / error / no-results |
| `Workbench/Project` | Project view (PV-00/PV-01): explorer tree, editor tabs, breadcrumbs, budget grid, overcommitment, engine error |
| `Workbench/Regions` | Each region on its own, for focused keyboard and visual review |

Where the code lives:

- `src/workbench/workbench.ts` — region builders + whole-workbench assembly
- `src/workbench/tree.ts` — explorer tree (`role=tree`, arrow keys, selection)
- `src/workbench/content.ts` — demo surfaces (CV-01, PV-00, PV-01, Chat, terminal)
- `src/workbench/icons.ts` + `assets/codicon.ttf` — Microsoft Codicons, copied
  unmodified from the fork's pinned `@vscode/codicons` (CC BY 4.0 / MIT; see
  `assets/CODICONS-LICENSE*.txt`)

Rules the replica follows:

- Colors come only from `chrome.*` tokens; metrics only from `workbench.*`
  tokens (`design/tokens/`). Light and high-contrast layers live in
  `.storybook/preview.css`. No literal color appears in `src/workbench/`.
- Demo surfaces compose `@obra/ui` (`obra-data-table`, `obra-tabs`,
  `obra-button`, `obra-empty-state`, `obra-error-state`, `obra-loading-state`,
  `obra-property-row`, `obra-select`, `obra-text-field`, `obra-text-area`).
- The replica is preview-only. It never ships in a webview, and it is not the
  merge gate (PRINCIPLES.md rule 10).

Replica gaps that are now closed (kept here so they never reopen silently):

| Gap | Closed by |
|---|---|
| Per-row actions (`Abrir`, `⋯`) in tables | `DataTable` column `render` cells — `Patterns/DataTable › Per-row actions` |
| Bold group and total rows | `DataTable` row `emphasis: 'group' \| 'total'` — `Patterns/DataTable › Tree, groups and totals` |
| Tabular figures in money columns | `DataTable` column `figures: 'tabular'` |
| Tree indentation of budget lines | `DataTable` row `level` (rubro → subrubro → línea) |

Known replica gaps (work to close, never a silent pass):

| Gap | Why | Where it belongs |
|---|---|---|
| Surface titles larger than 16px | the type scale tops out at `font.size.lg` | a token decision (design reviewer) |
| Activity bar labels | stock VS Code is icon-only; the company preview labels items | already a story option (`ActivityLabels`); keep testing both |

## Themes

The toolbar theme switcher swaps the token layer (`.storybook/preview.css`):

| Theme | Layer |
|---|---|
| **Light** | VS Code Light+ equivalents layered over the generated tokens |
| **Dark** | `@obra/ui/tokens.css` — the generated literal layer (the default) |
| **HighContrast** | VS Code High Contrast equivalents; defers to the OS `forced-colors` system palette when that mode is active |

The layer model is: `@obra/ui/tokens.css` is the dark base; `[data-obra-theme="light"]`
and `[data-obra-theme="high-contrast"]` override the `--obra-*` colors for their
subtree. Stories never hardcode a color — they reference `--obra-*` tokens only,
and the generated component `forced-colors` rules still apply.

## Accessibility checks (`pnpm ui:a11y`)

`pnpm ui:a11y` runs axe-core over the **built** Storybook and exits non-zero on
any violation. Its real prerequisites are:

1. `pnpm install` — installs `axe-core`, `@axe-core/playwright`, and `playwright`.
2. A static build: `pnpm --filter @obra/ui-storybook build-storybook` (writes
   `storybook-static/index.json`, which the script reads).
3. A Playwright browser: `npx playwright install chromium`. **This downloads the
   browser and requires network access**; in a network-isolated environment it
   fails, which is why no browser is checked in. Where a Chromium build is
   already in the Playwright cache, the script runs offline.

Then, from the repository root:

```bash
pnpm ui:a11y
```

The script starts a local static server for `storybook-static/`, opens every
entry from `index.json` in `iframe.html?id=<storyId>&viewMode=story`, and reports
violations per story. The `@storybook/addon-a11y` panel shows the same axe
results interactively while the dev server runs.

Three document-scope rules (`landmark-one-main`, `page-has-heading-one`,
`region`) are disabled on purpose: a story iframe renders one component on an
otherwise empty page, so it can never satisfy them, and leaving them on hid every
real violation behind ~350 false positives. Landmark and heading structure is a
page concern and is checked where pages exist — the real Code OSS host
(PRINCIPLES.md rule 10).

### Current backlog (gate is red until these are fixed)

Last run: 200 stories, 21 violations, three root causes — all pre-existing,
none specific to a single new component:

| Rule | Count | Root cause | Fix belongs to |
|---|---|---|---|
| `label` (critical) | 16 | `TextField` / `TextArea` stories render a bare control with no accessible name | the stories (wrap in `FormField` or set `aria-label`), and a `label`/`aria-label` contract on the primitives |
| `color-contrast` (serious) | 4 | the shared `DISABLED_CSS` treatment (`opacity: 0.4`) drops colored text below 4.5:1 — `Checkbox` disabled x2, `RadioGroup` disabled, `Link` disabled | a token decision: disabled needs a muted *color* token, not blanket opacity. Design reviewer call (Principle 9) |
| `scrollable-region-focusable` (serious) | 1 | `MasterDetail` extreme-content pane scrolls without keyboard access | `patterns/master-detail.ts` (`tabindex="0"` + `role="region"` + label on the scroll pane) |

## What is validated here vs. what is not

With dependencies installed, this workbench is live:

- `pnpm --filter @obra/ui-storybook build-storybook` succeeds and indexes every
  story in `storybook-static/index.json` (200 stories across 28 files at the
  time of writing, including `Primitives/Link` and `Primitives/Tag`).
- `pnpm ui:a11y` runs axe over all of them and reports the backlog table above.
- Every production component in `design/penpot-map.json` has a story file whose
  `title` matches its `story` path.

What Storybook does **not** prove (PRINCIPLES.md rule 10):

- Behavior inside the real Code OSS host — theme variables come from a live
  workbench there, not from `preview.css`.
- Document-level landmarks, headings, and focus order across a whole surface
  (the three document-scope axe rules are disabled here on purpose).
- Visual baseline approval, which is a design reviewer's call (Principle 9),
  never an output of this workbench.
