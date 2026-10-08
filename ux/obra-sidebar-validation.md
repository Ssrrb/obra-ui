# Obra sidebar validation — 2026-10-08

Implementation is on `feat/obra-sidebar` in both repositories. The native fork
adapter imports the generated stylesheet; it does not need the UI checkout at
runtime. Set `obra.sidebar.enabled` to `false` to restore native appearance.

## Completed checks

| Check | Result |
| --- | --- |
| New package build/scope/drift tests | 3 passed |
| Existing UI token tests | 11 passed |
| Token generation | 235 tokens; no generated drift |
| Fork stylesheet drift check | Passed |
| Storybook build | Passed, 230 stories |
| Client typecheck and `build-fast -- --client-only` | Passed |
| Adapter/entry ESLint | Passed |
| Generated CSS Stylelint | Passed; 4 advisory token-literal suggestions |
| Sidebar, Sentry, Modern UI regression suites | 91 passed, 1 Modern UI failure |
| Candidate patch ledger freshness | Passed; 10 core files within budget |

The Modern UI failure is `uses legacy border customizations for connected tabs`
(white pseudo-element color versus expected black). That fixture has no
`obra-sidebar` marker and targets the editor, outside this package's selectors.
It was not repaired as part of the sidebar port.

The full Storybook accessibility run reports 21 failures in unchanged stories
(4 contrast, 1 scrollable-region focus, 16 labels); workbench-shell stories passed.
Factory checks retain two failures: canonical ledger freshness (deliberately
not promoted to the candidate baseline) and the existing missing
`design/penpot-map.json`. Existing ledger ownership/sentinel debt also remains.

## Native host evidence and limits

`pnpm --filter @obra/workbench-ui test:host` opens a disposable Code OSS profile
and fixture workspace. It checks default activation and the actual compiled
adapter's startup, configuration events, auxiliary-container registration, and
disposal against service doubles. It captures the real native Explorer. These
service doubles do not prove integration with the native settings service.

Evidence lives in `.tmp/captures/obra-sidebar/report.json` and
`.tmp/captures/obra-sidebar/01-dark-enabled.png`. Full diagnostic logs are in
`.tmp/reports/obra-sidebar/`. These local artifacts are ignored by Git.

The broader host interaction attempt timed out on live configuration changes;
the subsequent UI-driven attempt failed to focus the command palette while a
modal settings editor remained open. No complete end-to-end interaction pass
is claimed. The committed smoke runner is limited to the checks above.

## Review checklist — pending

Use an isolated profile (`./scripts/code.sh --user-data-dir /tmp/obra-review-profile`)
with a throwaway workspace. Approve the screenshots and contract only after:

- Toggle `obra.sidebar.enabled` off/on through Settings; verify immediate updates
  and native geometry, editor, panel, secondary sidebar, and status/title bars.
- Repeat in dark, light, both high-contrast themes, and with user color overrides.
- Repeat with Modern UI on/off and forced colors; check focus visibility.
- Exercise Explorer/Search, tree keyboard navigation, context menus, file opening,
  drag-and-drop, long filenames, badges, scrolling, and empty/loading/error views.
- Resize and hide/show the sidebar; move it left/right; set activity bar to
  default/top/bottom/hidden. Top/bottom bars should retain native appearance.
- Open and close an auxiliary window; toggle the setting with both windows open.

Human visual approval and full native interaction verification remain pending.
