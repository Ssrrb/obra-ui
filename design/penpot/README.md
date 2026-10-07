# Penpot library structure

How the Obra Studio design system is organized in Penpot. Penpot itself cannot
be driven programmatically from this repo (no network, no Penpot API access);
these files are the machine-readable ground truth so later tooling or a human
operator can apply the structure. The component ids here are the contract: they
must match `@obra/ui` exports and `design/penpot-map.json`, per
`design/COMPONENT_RULES.md`.

## Library 1 — "VS Code UI Reference"

- **What it is:** imported Webview UI Toolkit (`@vscode/webview-ui-toolkit`)
  frames, kept for visual/behavioral reference only.
- **Status:** conceptually read-only. Never edit inside Penpot; never use as a
  source for production design.
- **Never production for agents.** Product code never imports the toolkit
  (PRINCIPLES.md rule 2). This library exists only so extraction notes in
  `design/extractions/` can be checked against the original visuals.
- Token mapping comes from `--vscode-*` variables; those visuals do **not**
  define the Obra look.

## Library 2 — "Obra Design System"

The single library production UI is designed from. Page / folder hierarchy:

| Page | Contents |
|---|---|
| `00 Foundations` | Semantic tokens (`design/generated/penpot-tokens.json`), spacing scale, type scale, focus ring, color roles |
| `01 Primitives` | One frame per primitive: Button, IconButton, TextField, TextArea, Checkbox, Radio/RadioGroup, Select/Option, Badge, Divider, Spinner, Progress, Tabs, Tab, TabPanel, Tooltip, Menu, MenuItem. Each component frame shows all defined states (loading, empty, error, disabled, focus-visible, extreme content) |
| `02 Patterns` | FormField, PropertyRow, Toolbar, FilterBar, SectionHeader, EmptyState, ErrorState, LoadingState, DataTable, MasterDetail, ConfirmationDialog |
| `03 Templates` | Composed page skeletons built only from the above (layout examples such as Stack-based forms, list + detail) |
| `04 Product Surfaces` | Actual named surfaces from UX contracts (e.g. `cost-control`, `company-view`, `project-view` per `design/SURFACE_RULES.md`) |
| `05 Explorations` | Working area; nothing here is authoritative and nothing here may be referenced as production |

## Component ids

Every production component id on pages `01 Primitives` and `02 Patterns` must
match a key in `design/penpot-map.json`, which links it to its `@obra/ui`
export class, custom element tag, and story path. Sync direction:

```
src/index.ts  ->  design/penpot-map.json  ->  Penpot component ids  ->  stories
```

The map's `conceptualOnly` section lists ids such as `obra/property-panel` that
are **not** production `@obra/ui` exports today. They may appear in Penpot as
placeholders or exploration, but they must not be treated as shipped
components until an export, tag, and story exist and a map entry is added.

## `libraries.json`

`libraries.json` encodes both libraries and the Obra page/folder hierarchy in a
form intended for a later tool that applies the structure to Penpot
(creating pages/components as it goes). It is documentation-by-encoding: keep it
in sync with this README and with `penpot-map.json`.

## Adding a component

Per `design/COMPONENT_RULES.md` ("Adding a component"): a new component
requires a `design/penpot-map.json` entry naming its code export, tag, Penpot
id, and story path, plus registration in `src/index.ts`. A design reviewer —
not the implementer — approves the visual baseline.
