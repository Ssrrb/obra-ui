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
   fails, which is why no browser is checked in.

Then, from the repository root:

```bash
pnpm ui:a11y
```

The script starts a local static server for `storybook-static/`, opens every
entry from `index.json` in `iframe.html?id=<storyId>&viewMode=story`, and reports
violations per story. The `@storybook/addon-a11y` panel shows the same axe
results interactively while the dev server runs.

## What is validated here vs. what is not

These files are scaffolded so the workbench is ready the moment dependencies
exist. Without `pnpm install`:

- TypeScript/ESM syntax is valid (stories transpile cleanly), but the
  `@storybook/*` and `axe-core` type imports are unresolved by design.
- Storybook is **not** built and no browser is downloaded (no network).
- `pnpm ui:a11y` cannot run until steps 1–3 above are complete.

Run `pnpm --filter @obra/ui-storybook build-storybook` and `pnpm ui:a11y` after
`pnpm install` to close that gap.
