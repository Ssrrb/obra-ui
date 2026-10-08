# UI Rules for Agents

Read this before touching any UI in Obra Studio. The authority is
`design/PRINCIPLES.md`; this file is the operating checklist. Repo layout:

- Wiki/docs: `../docs`
- VS Code fork (the real host): `../vscode`
- Design rules: `design/`
- Components: `packages/obra-ui/` (`@obra/ui`)
- Browser harness: `apps/ui-harness/`
- Host automation: `scripts/ui/`
- Extraction archive (reference only, never import): `design/extractions/reference/`
  The `vscode-webview-ui-toolkit/` checkout has been deleted — extraction is done.

## Non-negotiables

1. Prefer a native VS Code surface before a webview. Justify any webview in the
   UX contract.
2. Never import `@vscode/webview-ui-toolkit` in product code. Extraction is
   complete; the archived notes are in `design/extractions/`.
3. Consume only `@obra/ui`. Do not hand-roll buttons, inputs, or tables.
4. No hardcoded colors. Use semantic tokens.
5. No hardcoded arbitrary spacing/radius/font-size. Use tokens.
6. Reuse an existing component before creating a new one. Record the search.
7. Write a UX contract (`ux/CONTRACT_TEMPLATE.yaml`) before significant UI.
8. Define loading, empty, error, keyboard, and extreme-content states.
9. You cannot approve your own visual baseline. A design reviewer approves.
10. Run important workflows in the real Code OSS host before merge.

## Workflow

```
pnpm ui:tokens      # regenerate token artifacts (commit the result)
pnpm ui:storybook   # build/browse components and states
pnpm ui:test        # unit + interaction tests
pnpm ui:a11y        # accessibility checks
pnpm ui:visual      # visual regression against approved baselines
pnpm obra:launch    # launch the real Code OSS fork, print CDP handle
pnpm ui:e2e <flow>  # run a workflow inside the real host
```

## Definition of done

- Contract committed and states enumerated.
- Components come from `@obra/ui`; colors/spacing come from tokens.
- `pnpm ui:tokens` leaves a clean tree (no drift).
- Story covers every state, including high-contrast and extreme content.
- `pnpm ui:test`, `pnpm ui:a11y`, `pnpm ui:visual` pass.
- The workflow runs green in the real host via `pnpm ui:e2e`.
- A design reviewer (not you) approved the visual baseline.
