# UI Flows

Flows are workflow tests that run inside the **real Code OSS fork**
(`/Users/sebastian/Desktop/obra-studio/vscode`), driven by
`node scripts/ui/run-flow.mjs <flow>` (root script: `pnpm ui:e2e <flow>`).

Each flow is a file `scripts/ui/flows/<flow>.mjs` exporting:

```js
export const fixture = '../fixtures/<name>'; // optional: workspace opened at launch
export async function run(ctx) { /* steps */ }
```

## ctx API

| Property | Type | Description |
|---|---|---|
| `ctx.flow` | `string` | The flow name as passed on the command line. |
| `ctx.page` | `playwright-core` `Page` | The workbench page of the running Code OSS instance (already waited for `.monaco-workbench`). Interact with it directly (keyboard, selectors). |
| `ctx.cdpPort` | `number` | The remote-debugging port actually selected by Chromium (`DevToolsActivePort`). `http://127.0.0.1:<cdpPort>` serves the CDP endpoint. |
| `ctx.profile` | `string` | Absolute path of the isolated temp profile (`os.tmpdir()/obra-ui-test-<rand>`); removed when the run ends. |
| `ctx.fixture` | `string \| undefined` | Absolute path of the fixture workspace opened at launch (only if the flow declares `fixture`). |
| `ctx.capture(step)` | `(step: string) => Promise<string>` | Saves a screenshot of `ctx.page` to `<ui repo>/.tmp/captures/<flow>/<step>.png` and returns the path. Also records the step in the result JSON. |
| `ctx.log(message)` | `(message: string) => void` | Writes a diagnostic line to stderr (stdout carries only the result JSON). |

## Naming rules (enforced, path-safety)

- Flow names must match `/^[a-z0-9][a-z0-9-]*$/` — no slashes, dots, or `..`,
  so `<flow>` can never traverse out of `flows/` or the captures tree.
- Capture step names must match `/^[a-z0-9][a-z0-9._-]*$/` with no `..`
  segments, so `capture()` can only write under `.tmp/captures/<flow>/`.

## Result statuses

- `passed` (exit 0) — every step ran and the target screen was verified.
- `failed` (exit 1) — flow logic, environment, or product behavior failed.
- `not-implemented` (exit 2) — the product command/screen does not exist in
  the real fork yet. The flow must throw an error whose message starts with
  `NOT IMPLEMENTED IN HOST:` for this status. **Never** fake a pass or
  substitute an unrelated screen; honest evidence (screenshots) is captured
  and reported instead.

## Existing flows

### `cost-control`

Opens `fixtures/cost-control`, verifies the fixture workspace is open, opens
the quick input, searches for the `Cost Control` command, and captures evidence.
Current honest status: **not-implemented** — the Obra Studio extension does not
exist in the fork yet, so the command is not registered. Screenshots
`01-workbench-opened`, `02-fixture-open`, `03-command-search`, and `zz-error`
are still produced as environment evidence.
