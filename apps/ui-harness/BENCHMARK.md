# Phase 9 — Cost-control benchmark

One complete browser benchmark, not a whole-product conversion. The UX contract
is `../../ux/cost-control.yaml` (committed before implementation).

## Try it

From the UI workspace root, after `pnpm install` and `pnpm --filter @obra/ui build`:

```sh
pnpm --filter @obra/ui-harness dev -- --port 5174
```

Open **http://localhost:5174/?fixture=multiProject**. Port 5173 is the normal
Vite default; 5174 avoids another local application's existing server.
Storybook stays separate at http://localhost:6006.

1. Select **Borealis Platform**. The table changes to its 12 cost lines.
2. Type a line-item name or ID into **Search**. Combine category and status
   filters; observe the result count. Try a nonexistent value, then **Clear filters**.
3. Select a row. Its detail pane shows full wrapping values. Use arrow keys
   to change selection and Enter to move focus into details.
4. **Edit item**: try a negative amount, then a valid decimal. **Save changes**
   waits for the mock host acknowledgment. Escape or Cancel leaves costs unchanged.
   Switch project or row while dirty: explicitly discard, or cancel to keep edits.
5. **Add cost item**: enter name, category, status and amount. Try invalid input
   before saving. The mock host validates again; successful acknowledgment adds a row.
6. Open **Budget summary** for unfiltered totals and the budget meter. Budget
   allocation remains fixed when costs change; totals are computed in cents.
7. **Analyze costs** opens **AI review**. The deterministic mock proposes a 15%
   reduction on the most expensive cost line. Review the rationale, source item,
   before/after and budget impact. **Reject** changes nothing. **Accept suggestion**
   opens a second confirmation; **Apply change** still waits for the correlated
   host acknowledgment. Cancel while pending ignores a late response.
8. Reload with `?fixture=empty`, add the first item; try `?fixture=error` and
   Retry; inspect loading, slow, permission-denied, read-only and extreme fixtures.

All data and AI responses are explicitly mocked. Nothing is sent to a service,
no real vendor rate is changed, and fixture mutations reset when the page reloads
or `window.__obraHarness.reset()` runs. The mock does not pretend to be the real
Code OSS extension.

## Acceptance matrix

| Requirement | Implementation / scenario | Executed coverage |
|---|---|---|
| Navigation | Project selector; Line items / Budget summary / AI review tabs | Project data switch, section visibility, keyboard tab navigation |
| Toolbar | Add item, refresh, analyze; pending and permission restrictions | Add validation/save, refresh keyboard activation, read-only restrictions |
| Table | Raw costs separated from display; stable IDs; restored selection | Mouse/arrow/Enter selection, one row, 1000 rows, long values |
| Filters | Search, category, status, result count, clear | Combined filters, no matches, retained focus/caret, clear |
| Panels | Editable details, summary totals, AI proposal | Edit/save/cancel, dirty row/project changes, wrapping long values |
| Empty | Empty project vs no matching filters | Add first item and clear no-result filters |
| Loading | Initial, delayed fixture, project switch, pending mutation/AI | Loading fixture audit; slow delivery; disabled pending controls |
| Errors | Retry, inline mutation rejection, analysis error | Error recovery, saved draft after rejection, analysis retry |
| Keyboard | Named native controls; component keyboard patterns; focus restoration | Table/tabs, Enter actions, Escape edit cancellation, 320px interaction |
| AI | Deterministic proposal, reject/cancel, explicit confirmation and acknowledgment | Accept/reject/cancel/error, late answers, fixed budget, stale source/replayed apply guards |
| Accessibility | Labels, focus indicators, valid table/tab/property semantics | Axe WCAG A/AA/2.1 AA checks across all 11 fixtures, forms, summary, AI proposal and confirmation |
| Responsive/themes | Wrapping toolbar/filters, internally scrollable table/detail | 320px width; primary interactions and visible focus under forced-colors + RTL |

See `tests/cost-control.spec.ts`, `tests/accessibility.spec.ts`,
`tests/vscode-api.spec.ts` and `tests/logic/*.test.ts` for exact assertions.
Automated accessibility success is **not** a screen-reader certification.

## Repeatable checks

From `apps/ui-harness/`:

```sh
pnpm test:logic                 # compile TS to a temp directory; node:test
pnpm test:interaction           # Chromium workflow + mock bridge checks
pnpm test:a11y                  # axe over fixtures, forms and AI review
pnpm build                     # production Vite build
```

If another app occupies port 5173, use:

```sh
OBRA_HARNESS_PORT=5174 pnpm test:interaction
OBRA_HARNESS_PORT=5174 pnpm test:a11y
```

Playwright starts the matching server if needed. A manually started server must
actually be this harness, not another app on the same port. Existing Chromium
binaries were used during implementation; no browser download was required.

**Implementation checks executed:** strict TypeScript for `@obra/ui` and the
harness; production Vite build; 24 pure logic tests; 19 cost-control browser
workflows; two VS Code API tests; 15 automated accessibility cases; unknown-fixture
no-fallback assertion. Draft screenshots were captured for all fixtures and a
320px viewport outside the repository.

## Still required before product merge

- **Design approval:** no screenshot baselines were self-approved or committed.
  Record candidate baselines with `pnpm exec playwright test visual.spec.ts
  --update-snapshots`, then have an independent design reviewer approve them.
- **Real Code OSS integration:** `scripts/ui/flows/cost-control.mjs` cannot pass
  until the fork has the Obra cost-control command/webview. Browser tests do not
  satisfy this host gate. No Electron launch was performed.
- **Manual screen-reader and broader theme/zoom review:** axe and the focused
  keyboard/forced-colors/RTL checks do not establish complete AT support,
  all theme contrast pairs, or full RTL spatial mirroring.

## Component integration fixes

Browser execution exposed existing `@obra/ui` defects that blocked the benchmark.
Narrow fixes prevent recursive tab activation and state initialization crashes,
forward native input/select names and disabled/value state, restore table
selection without stealing search focus, remove nested grid semantics, place
property rows inside a valid definition list, and name budget progress. These
remain framework-free, use existing tokens, and are exercised by the benchmark's
browser and accessibility tests. No new shared component was introduced.
