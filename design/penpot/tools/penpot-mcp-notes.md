# Penpot MCP execution notes

Operational facts for every agent that drives the design file. Read once per
session. The connection pairs the OpenCode MCP client with the Penpot MCP
plugin through the user token in `~/.config/opencode/opencode.json`. The token
never enters this repository.

## Connection model

- The plugin pairs with the open file in one browser session. Keep the plugin
  window open while an agent works; closing it ends the session.
- One connection covers the whole file. Agents switch pages with
  `penpot.openPage(name)` and never need a second pairing.
- If a call fails with `No Penpot instance connected for user token`, the
  plugin side dropped: ask the user to reopen the plugin in the file.
- If it fails with `Permission ... is not granted`, the call touched a
  permission-gated API (like `penpot.currentUser`); the user approves grants in
  the plugin window.

## execute_code shape

- `penpot` and `penpotUtils` exist ONLY inside the code string passed to
  `penpot_execute_code`. Never reference them from agent-side code.
- Top-level `await` works inside the code string. An IIFE wrapper returns
  nothing. Keep the final statement a plain `return`.
- The plugin host parses long scripts badly: keep each `execute_code` call
  small, and hand data through `storage` (it persists across calls) instead of
  inlining large literals next to `penpot` calls in one script.
- Do not log what you also return.
- Long scripts that mix a large data literal with `penpot` calls can fail with
  a misleading `Unknown identifier 'penpot'`. Split data into `storage` first,
  then run logic in a second, small call.

## Audit trail

- `penpot.currentFile.saveVersion(label)` checkpoints the file. Agents save a
  version before the first write and after the last write of every task, with
  a label that names the frame and the action.
- Audit reports go to `design/reports/<frame-id>/` in the repository.

## Network

- Design-loop agents need only the repository and the plugin. Their agent
  definitions deny `webfetch` and `websearch`; a run that fetches docs dies on
  a DNS failure and wastes the task. Nothing on the network carries design
  decisions.

## Known catalog limits

- Penpot shadow tokens reject a negative spread. The canonical DTCG files keep
  the negative spread (the CSS build uses it verbatim); the Penpot token holds
  the clamped 0px value. The generated CSS stays authoritative for the fork.
- Penpot holds no token type for durations or scale factors, so the motion
  tokens stay canonical-only and apply to the CSS build, never to frames.
