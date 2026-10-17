# Provenance — `packages/obra-budget-editor`

This package is a vendored copy of **Open Calc Studio**, adapted to run as the
budget ("Presupuestos") editor inside a ctrl VS Code webview.

| Field | Value |
| --- | --- |
| Upstream | https://github.com/OpenAEC-Foundation/open-calc-studio |
| Commit | `b47042704efa388d95eb59ce77d23aeb5ee0e44c` |
| Version | `0.13.0` (root `package.json` and `packages/embed/package.json`) |
| Export method | `git archive b47042704efa388d95eb59ce77d23aeb5ee0e44c \| tar -x` (clean tree; local modifications of the research checkout were not copied) |

The first commit that adds this directory contains the upstream files
unchanged (plus this file). All ctrl adaptations are in later, separate
commits, so `git diff <import-commit>..HEAD -- packages/obra-budget-editor`
shows every change made to upstream.

## Excluded from the export

| Path | Why |
| --- | --- |
| `src-tauri/` | Rust/Tauri desktop shell. The ctrl build is a browser webview; nothing from it is bundled. |
| `mcp-server/` | Stand-alone MCP server for the desktop app. Not part of the web/embed build; ctrl disables MCP. |
| `snap/` | Linux Snap packaging of the desktop app. |
| `node_modules/` | Not tracked upstream; dependencies are installed with pnpm. |
| `verification/` | ~16 MB of third-party FIEBDC-3 (`.bc3`) / ÖNORM sample files collected from public websites plus screenshots — desktop/import QA evidence with mixed, unverified licensing. Only `src/test/bc3Roundtrip.test.ts` reads it, and that test skips itself when the directory is absent (`describe.skipIf`). |
| `.github/` | Upstream CI workflows (Tauri/Snap release builds); they would never run from a sub-directory of this repo. |

Notes:

- `libs/openaec-reports` is a git submodule upstream (gitlink). `git archive`
  does not include submodule contents, so the directory is empty and is not
  tracked here. The web/embed build does not import it.
- `.env.development` / `.env.production` are tracked upstream (they contain
  only build flags, no secrets) but match upstream's own `.gitignore`
  (`.env.*`); they were added with `git add -f` to keep the import faithful.

## License status — DISTRIBUTION BLOCKED

- Upstream `README.md` says MIT, and `packages/embed/package.json` declares
  `"license": "MIT"`.
- The upstream repository contains **no `LICENSE` file** at this commit, and
  the GitHub API reports `license: null` for the repository.
- MIT requires the copyright notice and permission notice to be included in
  copies. No authentic copyright line exists upstream, and none has been
  invented here.

**Do not ship or redistribute this package (or `dist-ctrl/` built from it)
outside internal development until an authentic license notice — copyright
holder and year — has been obtained from the OpenAEC Foundation (e.g. a
`LICENSE` file added upstream, or written confirmation).** Once obtained, add
it verbatim as `LICENSE` in this directory and update this section.

## Workspace integration

- Package renamed to `@ctrlmas/obra-budget-editor` (still `private`) and
  installed through the pnpm workspace; upstream's npm `package-lock.json` was
  removed in favour of the root `pnpm-lock.yaml`. Dependency ranges are
  unchanged.

## Upstream test characterization

`pnpm exec vitest run` in this directory, right after the import (no source
changes), Node 24.18, vitest 4.1.12:

- Test files: 66 passed, 3 skipped, **1 failed** (70)
- Tests: 446 passed, 6 skipped (452)
- The failing file is `src/test/onlvRoundtrip.test.ts`: it reads
  `verification/onorm-a2063/LB-SCHOKO_V2021.onlb` at collection time (inside
  a `describe.skipIf` body, which vitest still evaluates), and `verification/`
  is excluded from this import. Not a behaviour failure; left as is.
- Skipped tests need private/absent fixtures (`verification/`, IBIS-TRAD
  `.xtb` customer files).

## ctrl adaptations

New, ctrl-only: `src/ctrl/` (webview entry, bridge, controller, stubs,
tests), `vite.ctrl.config.ts`, `scripts/ctrl-manifest.mjs`, the
`build:ctrl`/`test:ctrl` scripts.

Upstream files modified (all gated on `CTRL_BUILD`, i.e. no behaviour change
in upstream's own builds):

| File | Change |
| --- | --- |
| `src/services/buildFlags.ts` | adds `CTRL_BUILD` (`VITE_CTRL_BUILD=true`, set only by `vite.ctrl.config.ts`) |
| `src/App.tsx` | hides title bar, file tab bar, start sidebar, chat, feedback dialog, the app-name heading of the empty state; skips user-extension loading (`new Function`) and the MCP bridge |
| `src/components/backstage/Backstage.tsx` | hides New/Open/Save/Save as, OpenAEC Cloud, Extensions, About, Exit; opens on the Import panel |
| `src/hooks/useKeyboardShortcuts.ts` | Ctrl+N/O/S/Shift+S pass through to VS Code |
| `src/state/slices/resourceLibrarySlice.ts` | no startup `fetch('/libraries/middelen-gww.json')` |

The ctrl build also replaces the 3D and PDF viewers (hidden tabs) with empty
stand-ins at build time (`src/ctrl/stubs/viewers.tsx`); the upstream files
are unchanged.
