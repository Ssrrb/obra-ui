# UI Principles

Non-negotiable rules for every UI surface in Obra Studio. These are L0 for the
UI platform. When this file and any other UI document disagree, this file wins.
`.agents/ui-rules.md` restates these for agents; the two must stay in sync.

## The ten rules

1. **Prefer native VS Code surfaces before webviews.** Use tree views, editors,
   terminals, notifications, quick picks, and the workbench contribution points
   first. A webview is a last resort, and it needs a reason recorded in a UX
   contract.
2. **Product code never imports the deprecated Webview UI Toolkit**
   (`@vscode/webview-ui-toolkit`). It stays in the repo only as a read-only
   reference for extraction (see `design/extractions/`).
3. **Product code consumes only `@obra/ui`.** No ad-hoc component libraries, no
   copy-pasted markup from other extensions, no bespoke buttons.
4. **Hardcoded colors are forbidden.** Every color resolves to a semantic token,
   which resolves to a `--vscode-*` theme variable.
5. **Hardcoded arbitrary spacing/radius values are forbidden.** Spacing, radius,
   font size, and elevation come from tokens.
6. **Existing components are reused before new components are created.** A new
   primitive or pattern needs a UX contract that names what it searched for and
   why the existing set does not fit.
7. **Every significant UI requires a UX contract** (`ux/CONTRACT_TEMPLATE.yaml`)
   committed before implementation.
8. **Every significant UI must define loading, empty, error, keyboard, and
   extreme-content states.** "It works on the happy path" is not done.
9. **The implementation agent cannot approve visual baselines.** Approval comes
   from a design reviewer. The implementer records, the reviewer accepts.
10. **All important workflows must run inside the real Code OSS host before
    merge.** Browser harness and Storybook are fast feedback, not the gate.

## Dependency direction

The dependency graph flows one way. Nothing reaches upward.

```
Product UI
    ↓
Obra patterns      (@obra/ui patterns)
    ↓
Obra primitives    (@obra/ui primitives)
    ↓
Obra semantic tokens
    ↓
VS Code theme variables (--vscode-*)
```

A primitive may use tokens. A pattern may use primitives and tokens. Product UI
may use patterns, primitives, and tokens. Nothing else.

## What "significant UI" means

Any surface a user sees for more than a moment, any surface with more than one
state, any surface with input, and any surface that could block a workflow. When
in doubt, write the contract.
