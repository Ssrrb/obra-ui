# Native Obra workbench UI

This package owns the styling source for the native VS Code activity bar and
primary sidebar. The reference is `Workbench/Shell`; its preview DOM never ships.
No new components or framework dependencies are introduced.

From the UI repository:

```sh
pnpm ui:tokens
pnpm workbench:sync
pnpm workbench:check
pnpm --filter @obra/workbench-ui test
pnpm --filter @obra/workbench-ui test:host
```

For another fork/worktree, run `node scripts/build.mjs --vscode-root /absolute/path`
from this package. `--check` compares both artifacts without writing. Generated
`dist/sidebar.css` is build output; the copy under `obraSidebar/browser/media/`
is committed in the fork so it builds without this repository. Never edit that copy.

The fork adapter registers `obra.sidebar.enabled` (true by default) and applies
the `obra-sidebar` workbench marker. Disabling it restores the active native
theme and Modern UI treatment immediately. Theme bindings follow live VS Code
variables. Obra aliases resolve at build time into native theme bindings, avoiding
an upstream CSS-variable registry patch. Every selector remains scoped to the marker.

Native hit targets, sidebar widths, virtualized row heights, icons, navigation,
menus, loading/error/empty content, focus, and drag feedback remain owned by VS Code.
Obra owns sidebar heading typography and the flat activity selection treatment.
Top/bottom/hidden activity bars keep their native treatment. Modern UI geometry
and density remain unchanged, while scoped Obra appearance takes precedence.

Upstream dependencies to recheck after syncing: `.part.sidebar`, `.part.activitybar`,
`.title-label h2`, `.monaco-pane-view .pane-header`, `.monaco-action-bar`,
`.action-item.checked`, `.active-item-indicator`, and `.action-label.codicon/uri-icon`.
Generated CSS and the registration import carry patch-ledger sentinels.

UX contract: `../../ux/obra-sidebar.yaml`. Capture real-host screenshots for
human design review; the existing repository has no approved visual regression runner.

`test:host` uses the existing Storybook Playwright installation and Code OSS
binary resolver, with Playwright's Electron connection. It opens a temporary fixture workspace/profile, verifies the compiled
adapter lifecycle and default native startup, and saves evidence under
`.tmp/captures/obra-sidebar/`. The personal profile is never read or changed.

The automated host check is a smoke check. Live configuration, the theme/layout
matrix, native interactions, and real auxiliary-window behavior still require
the manual checklist in `../../ux/obra-sidebar-validation.md`.
