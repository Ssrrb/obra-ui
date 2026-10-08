# Archived Webview UI Toolkit reference

The local checkout of Microsoft's `@vscode/webview-ui-toolkit`
(`ui/vscode-webview-ui-toolkit/`, ~220 MB including its own git history and
docs assets) has been **deleted**. Extraction is complete: every component the
toolkit shipped now has an `@obra/ui` counterpart, an extraction note in
`../`, and a story in `packages/obra-ui/stories/`.

This folder is what we kept, so the deleted checkout is never needed again.

## Contents

| Path | What it is |
|---|---|
| `vscode-design-tokens.ts` | Verbatim copy of the toolkit's `src/design-tokens.ts` — the source of truth for every `--vscode-*` variable the toolkit read |
| `vscode-token-map.md` | Generated table of all 67 toolkit tokens: token name → `--vscode-*` variable → type → dark-theme default. Our `design/tokens/vscode.json` fallbacks were verified against this |
| `component-docs/*.md` | The toolkit's per-component documentation (15 components: usage do/don't, attributes, examples) |
| `component-index.md` | The toolkit's `docs/components.md` index, relinked to `component-docs/` |
| `source/<component>/*.styles.ts` | All 21 toolkit style sources (badge, button, checkbox, data-grid x3, divider, dropdown, link, option, panels x3, progress-ring, radio, radio-group, tag, text-area, text-field). These are the ground truth the `--vscode-*` mappings in `../*.yaml` were read from, and the reference for any re-verification |
| `source/applyTheme.ts` | The toolkit's theme bridge: how it reacted to `data-vscode-theme-kind` and which tokens it forced transparent in high contrast. Extracted into `../theme.yaml` |

Not archived, deliberately: the FAST wiring (`index.ts`, `custom-elements.ts`,
`utilities/design-tokens/create.ts`, the React wrapper), the 104 MB of docs
images, and the toolkit's own git history. All of it is `do_not_copy` material
(FAST architecture) or reproducible from upstream.

## Provenance and license

- Upstream: https://github.com/microsoft/vscode-webview-ui-toolkit
- Version: 1.4.0 (last commit in the deleted checkout: `6683e64`)
- License: MIT, Copyright (c) Microsoft Corporation. The license headers are
  preserved in every copied file.
- Image assets (`docs/assets/images/*`, ~104 MB of PNG/GIF) were **not**
  archived, so the `![...](/docs/assets/images/...)` links inside
  `component-docs/*.md` are dead by design. The text (usage do/don't rules,
  attribute tables, examples) is what we extracted.
- Re-fetch if ever needed (network required):
  `git clone --depth 1 https://github.com/microsoft/vscode-webview-ui-toolkit.git`

## Rules that still apply

- This archive is **reference material only**. Nothing here may be imported by
  product code (`design/PRINCIPLES.md` rule 2), and no FAST runtime dependency
  may be reintroduced.
- We keep behavior and token mappings; implementations are our own
  framework-free custom elements (`design/COMPONENT_RULES.md`).
