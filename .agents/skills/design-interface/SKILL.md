---
name: design-interface
description: >-
  Use when designing a surface for Obra Studio: turning a wiki rule into an
  approved UX contract, reviewed Penpot frames, and a registry entry. Covers
  the native-before-webview rank order, tokens, the component registry, the
  contract freeze, and the HG-1 human signature. This is Flow A of the Obra
  factory.
---

# Design an interface — Flow A (designing)

Full flow: `.agents/flows/design-interface.md` in this repository (a
byte-identical copy of `factory/flows/design-interface.md`). Read it before
starting — it is the authority. The shared envelope is in
`.agents/flows/README.md`.

- **Trigger** — a rule in the wiki's `docs/product/` or `docs/domain/` needs a
  surface, or a roadmap initiative names one. A surface that satisfies no rule
  does not exist.
- **Exit artifact** — an approved `ux/<surface-id>.yaml` (the contract freeze,
  HG-1), reviewed frames, and an entry in `design/penpot-map.json`. Nothing
  downstream accepts a UI task without it.
- **Surface rank order — native before webview**: command palette, quick pick,
  tree view, editor, status bar, notification, then webviews. Record every
  rejection in `native_options_considered`; a webview without its reason fails
  the check.
- **Tokens are the only source of color and size** — DTCG sources in
  `design/tokens/`, generated artifacts in `design/generated/`; regenerate
  with `pnpm ui:tokens` and commit the result. A new color is its own token
  PR, never inlined in a surface.
- **Components** — reuse an existing `@obra/ui` component before creating one;
  record the search in the contract. `design/penpot-map.json` links Penpot id,
  `@obra/ui` export, custom-element tag and story path, and must agree with
  the code.
- **Contract freeze** — fill every field except `review.approved_by` and
  `review.approved_at`; a human design reviewer (never the implementer) fills
  those. That signature is HG-1 and it blocks implementation.
- **Gates A-G1..A-G7** and the evidence list (audit, verdict, frames, contrast
  report, tokens row count) are in the flow.

Workspace note — `../wiki`, `../vscode` and the `factory/…` paths in the flow
refer to sibling repositories of the Obra workspace (`factory/manifest.yaml`
names every repository and its remote). When only this repository is checked
out, resolve what you can from the sibling remotes and report the rest as
unknown — a check that could not run is never green.
