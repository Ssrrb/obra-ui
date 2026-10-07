# @obra/ui

The only UI kit Obra Studio product code may import (Principle 3). Framework-free
custom elements built on semantic tokens that resolve to VS Code theme variables.

## Layers

- `src/foundations/` — base element, shared styles, a11y/keyboard helpers
- `src/primitives/` — Button, IconButton, TextField, TextArea, Checkbox, Radio,
  Select, Badge, Divider, Spinner, Progress, Tabs, Tooltip, Menu
- `src/patterns/` — FormField, PropertyRow, Toolbar, FilterBar, SectionHeader,
  EmptyState, ErrorState, LoadingState, DataTable, MasterDetail,
  ConfirmationDialog
- `src/layouts/` — Stack
- `src/utilities/` — DOM helpers

## Use

```ts
import { defineObraUI } from '@obra/ui';
import '@obra/ui/tokens.css'; // or vscode-fallback.css inside a real webview
defineObraUI();
```

```html
<obra-button variant="primary">Save</obra-button>
<obra-data-table status="loading"></obra-data-table>
```

## Rules

Components consume `--obra-*` tokens only — never a literal color, spacing, or
radius (Principles 4 & 5). Behaviors (keyboard, ARIA, focus) are extracted from
the reference toolkit and reimplemented here; see `design/extractions/` and
`design/COMPONENT_RULES.md`.

## Develop

```
pnpm --filter @obra/ui build   # tsc -> dist
pnpm --filter @obra/ui test    # node --test
```
