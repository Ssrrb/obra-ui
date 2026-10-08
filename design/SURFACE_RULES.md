# Surface Rules

How to choose a surface, and what each surface is allowed to do. Surfaces are
listed from most preferred to least preferred (Principle 1).

## Order of preference

| Rank | Surface | Use it for | Never use it for |
|---|---|---|---|
| 1 | Command Palette / commands | Any action with a verb | Long-form input |
| 2 | Quick Pick | Choose 1 of N, fuzzy search | Multi-step forms |
| 3 | Tree View | Hierarchical browsing (projects, obra, budgets) | Free text editing |
| 4 | Editor (custom / text) | Documents, tables, detail panes that need space | Simple confirmations |
| 5 | Status Bar item | Ambient state, one-click entry | Anything needing labels |
| 6 | Notification / Message | Results, errors, confirmations with a message | Data entry |
| 7 | Webview Panel | Rich product UI (`@obra/ui` only) | Anything a native surface can do |
| 8 | Webview View | Persistent `@obra/ui` side panel | Anything a tree view can do |

## Choosing a webview

A webview is chosen only when the UX contract records:

- The native surfaces considered and why each was rejected.
- That the webview renders **only** `@obra/ui` components and tokens.
- The host messages it needs (it must go through a typed message bridge, never
  reach into the extension host directly).

## Webview rules

- The webview loads the theme through the standard VS Code CSS variables
  (`--vscode-*`) that the host injects. It never ships its own color values.
- `acquireVsCodeApi()` is called once. In tests it is mocked; the mock lives
  with the webview's own tests in the app repository
  (`../vscode/extensions/obra-studio/`), not in this one.
- The webview must render its loading, empty, error, and permission-denied
  states before any data arrives (Principle 8).
- All focus must be reachable and visible by keyboard inside the webview.

## Surface identity

Every production surface has a stable id used across the contract, the harness
fixtures, the Penpot map, and the e2e flows. Example: `cost-control`,
`company-view`, `project-view`.
