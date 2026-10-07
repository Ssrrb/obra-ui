# Tokens

How design tokens flow from source to every consumer.

## Canonical source

`design/tokens/` holds the only hand-edited token files, in DTCG format
(`$type` + `$value`):

| File | Holds |
|---|---|
| `primitive.json` | Raw scale values: `space.1`, `radius.small`, `font.size.sm` |
| `semantic.json` | Meaning: `surface.default`, `text.primary`, `border.focus` |
| `component.json` | Per-component overrides that reference semantic tokens |
| `vscode.json` | The semantic → `--vscode-*` mapping |

Semantic tokens reference primitives with DTCG aliases (`{space.2}`). VS Code
mappings reference semantic tokens. Nothing hardcodes a hex in semantic or
component files; only primitives hold literal values.

## Generated artifacts

`pnpm ui:tokens` reads `design/tokens/` and writes `design/generated/`:

| Output | Consumer |
|---|---|
| `tokens.css` | CSS custom properties (`--obra-*`) for webviews |
| `tokens.ts` | Typed token map for `@obra/ui` |
| `vscode-fallback.css` | `--obra-* → var(--vscode-*, fallback)` runtime layer |
| `penpot-tokens.json` | Penpot token import |
| `tokens.md` | Human-readable documentation |

Generated files are committed. CI runs `pnpm ui:tokens` and fails if the tree is
dirty — the committed artifacts must always equal the source.

## Mapping examples

```
surface.default → --vscode-editor-background
surface.raised  → --vscode-sideBar-background
text.primary    → --vscode-foreground
text.secondary  → --vscode-descriptionForeground
border.default  → --vscode-widget-border
border.focus    → --vscode-focusBorder
action.primary.background → --vscode-button-background
action.primary.foreground → --vscode-button-foreground
danger.background → --vscode-inputValidation-errorBackground
```

## Rules

- Product and component code reference semantic tokens (`--obra-text-primary`),
  never primitives and never `--vscode-*` directly.
- A new color need starts as a semantic token, mapped in `vscode.json`.
- Contrast is measured at the semantic layer; the report lives in
  `design/generated/tokens.md`.
