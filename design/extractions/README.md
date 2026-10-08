# Extractions

One-time extraction of behavior and token mappings from Microsoft's
`@vscode/webview-ui-toolkit`. **Extraction is complete and the local checkout has
been deleted**; the parts worth keeping (token table, per-component docs, the two
last style sources, the theme bridge) are archived in [`reference/`](reference/README.md).
We keep **behavior and theme mappings**; we never copy the FAST architecture or
take a runtime dependency (Principle 2, `design/COMPONENT_RULES.md`).

Each `*.yaml` records, per component: the toolkit source, what we extracted, what
we deliberately did not copy, and the exact `--vscode-*` variables the mapping
uses (verified against the archived `reference/vscode-token-map.md`).

| Obra component | Toolkit source | Note |
|---|---|---|
| Button / IconButton | `button` | [button.yaml](button.yaml) |
| Checkbox | `checkbox` | [checkbox.yaml](checkbox.yaml) |
| Radio / RadioGroup | `radio`, `radio-group` | [radio.yaml](radio.yaml) |
| Select | `dropdown`, `option` | [select.yaml](select.yaml) |
| TextField / TextArea | `text-field`, `text-area` | [text-field.yaml](text-field.yaml) |
| Badge | `badge` | [badge.yaml](badge.yaml) |
| Tag | `tag` | [tag.yaml](tag.yaml) |
| Link | `link` | [link.yaml](link.yaml) |
| Divider | `divider` | [divider.yaml](divider.yaml) |
| Progress / Spinner | `progress-ring` | [progress.yaml](progress.yaml) |
| Tabs | `panels` | [tabs.yaml](tabs.yaml) |
| DataTable | `data-grid` | [data-grid.yaml](data-grid.yaml) |
| *(theme bridge, all components)* | `utilities/theme` | [theme.yaml](theme.yaml) |

## do_not_copy (applies to every note)

- FAST-specific architecture (`@microsoft/fast-element` templates, behaviors,
  the `DesignSystem` / `DesignToken` runtime).
- The deprecated toolkit runtime dependency itself.
- Hardcoded defaults presented as the source of truth — we keep them only as
  *fallbacks* behind `var(--vscode-*, fallback)` in `design/tokens/vscode.json`.
- The MutationObserver theme plumbing (`reference/source/applyTheme.ts`) — the
  cascade does that job for us; see [theme.yaml](theme.yaml).
