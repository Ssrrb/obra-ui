# scripts/ui — Code OSS automation harness

Real-host automation for Obra Studio UI. Launches the **actual Code OSS fork**
checked out at `/Users/sebastian/Desktop/obra-studio/vscode` (never a browser
harness, never a personal profile) and runs named UI flows inside it via the
Chrome DevTools Protocol.

## Components

| File | Purpose |
|---|---|
| `launch-code.mjs` | Launches the built fork with an isolated profile + remote debugging; prints a JSON handle on stdout. Also a library (`launchCode()`) used by `run-flow.mjs`. |
| `run-flow.mjs` | Runs `flows/<flow>.mjs` against the launched app over CDP with playwright-core. |
| `capture.mjs` | Stable screenshot capture into `.tmp/captures/<flow>/<step>.png` with strict name validation. |
| `flows/` | Flow definitions (`cost-control.mjs`) and `README.md` documenting the `ctx` API. |
| `fixtures/` | Fixture workspaces opened by flows (`cost-control/`). |

## Prerequisites (read before first run)

1. **Dependencies — `pnpm install` required.** From the repo root:

   ```sh
   cd /Users/sebastian/Desktop/obra-studio/ui
   pnpm install
   ```

   This installs the workspace. `run-flow.mjs` needs `playwright-core`; it is
   resolved from the workspace (the `playwright` devDependency of
   `packages/obra-ui-storybook` bundles it). Alternatively
   `cd scripts/ui && npm install` installs the local `package.json`, which
   declares `playwright-core` directly. If it is missing, `run-flow.mjs`
   fails with these exact instructions — nothing is downloaded at runtime.

2. **Node >= 20** (matches the root `package.json` `engines` field).

3. **The fork must be built.** The built Electron binary is expected at
   `vscode/.build/electron/<app>` (on macOS:
   `.build/electron/Code - OSS.app/Contents/MacOS/Code - OSS`) plus the
   compiled workbench (`vscode/out/main.js`). If it is missing,
   `launch-code.mjs` fails with actionable instructions:

   ```sh
   cd /Users/sebastian/Desktop/obra-studio/vscode
   ./scripts/code.sh
   ```

   `scripts/code.sh` performs the build prerequisites (npm install, workbench
   compile, Electron download); it needs network access and build tools. This
   harness itself makes **no network calls** and never runs the build.

## Commands

```sh
pnpm obra:launch          # launch the fork; JSON handle on stdout
pnpm ui:e2e <flow>        # run a flow in the real host (e.g. cost-control)
```

- `pnpm obra:launch` (CLI extras: `[path-to-open]`, `--port <n>`,
  `--keep-profile`, `-- <extra Code OSS args>`) prints exactly one JSON
  object on stdout:

  ```json
  {"cdpPort":41337,"pid":12345,"profile":"/var/folders/.../obra-ui-test-Xy1234"}
  ```

  All diagnostics go to stderr. The process stays attached while the app
  runs; Ctrl-C / SIGTERM terminates the app and removes the profile.

- `pnpm ui:e2e <flow>` connects over CDP (`playwright-core`), waits for the
  workbench, runs the flow with a `ctx` (see `flows/README.md`), captures
  screenshots, and prints a result JSON on stdout
  (`status: passed | failed | not-implemented`; exit codes 0/1/2).

## Isolation and cleanup

- A **fresh profile** is created per run under
  `os.tmpdir()/obra-ui-test-<random>` and passed with `--user-data-dir`.
  Personal profiles are never touched.
- `--remote-debugging-port` is passed; the harness allocates a free port and
  then reads the port Chromium actually selected from the profile's
  `DevToolsActivePort` file, so the handle is always accurate.
- `--disable-workspace-trust` is passed so flows are not blocked by the trust
  dialog.
- On flow end (pass, fail, or error) the app process is terminated
  (SIGTERM, then SIGKILL after a grace period) and the profile directory is
  deleted. `pnpm obra:launch --keep-profile` keeps it for debugging.

## Current honest limitations

- The **cost-control** flow reports status `not-implemented`: the Obra Studio
  product command/screen does not exist in the real fork yet, so the flow
  stops after capturing environment evidence (workbench open, fixture open,
  command search) and exits with code 2. It does not invent a pass or use an
  unrelated screen.
- Flow interaction today is limited to what the workbench exposes over CDP
  (DOM/keyboard). Once the product extension ships, `cost-control.mjs`
  already contains the invocation and target-screen verification steps.
