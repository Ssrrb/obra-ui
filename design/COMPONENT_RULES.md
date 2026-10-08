# Component Rules

How components are built, named, extracted, and shipped in `@obra/ui`.

## Layers

| Layer | Folder | May depend on | Examples |
|---|---|---|---|
| Foundations | `src/foundations/` | tokens only | theme bridge, focus ring, a11y helpers |
| Primitives | `src/primitives/` | foundations, tokens | Button, TextField, Checkbox |
| Patterns | `src/patterns/` | primitives, foundations, tokens | FormField, DataTable, MasterDetail |
| Layouts | `src/layouts/` | patterns, primitives | Panel, Split |
| Utilities | `src/utilities/` | — | class helpers, dom helpers |

A component only imports from layers at or below itself. Primitives never import
patterns. Patterns never import product code.

## Naming and identity

- Package: `@obra/ui`.
- Component export: `Button`, `TextField`, `DataTable` (PascalCase).
- Tag name: `obra-button`, `obra-text-field`, `obra-data-table` (kebab-case).
- Penpot id: `obra/button`, `obra/data-table` (see `design/penpot-map.json`).
- Story path: `Primitives/Button`, `Patterns/DataTable`.

The four names (code export, tag, penpot id, story) must all exist and be linked
in `design/penpot-map.json` for every production component.

## States every component defines

Loading, empty, error, disabled, focus-visible, and extreme content (very long
labels, very large/small datasets, RTL, high-contrast). If a state does not
apply, the story or contract says why.

## Extraction from the Webview UI Toolkit

The Microsoft toolkit is a reference, not a dependency (Principle 2). Extraction
is **complete**: the local checkout was deleted, and the parts worth keeping —
the full `--vscode-*` token map, the per-component docs, the last two style
sources, and the theme bridge — are archived in
`design/extractions/reference/`. When we build a component from that archive we
record an extraction note in `design/extractions/`:

```yaml
component: Button
source:
  vscode_toolkit: button
extract:
  - keyboard behavior
  - aria behavior
  - theme variables
  - sizing
  - focus treatment
  - disabled behavior
  - variants
do_not_copy:
  - FAST-specific architecture
  - deprecated runtime dependency
```

We keep the *behavior* and the *token mapping*; we rewrite the implementation as
plain, framework-free custom elements that read `--vscode-*` variables.

## Adding a component

1. Search the existing set (Principle 6). Record what you searched.
2. Write or extend a UX contract.
3. Add the token needs to `design/tokens/component.json` if any.
4. Implement the custom element + styles using tokens only.
5. Add a story covering every state.
6. Add a11y and (for patterns) interaction tests.
7. Register it in `src/index.ts` and `design/penpot-map.json`.
8. A design reviewer — not the implementer — approves the visual baseline.
