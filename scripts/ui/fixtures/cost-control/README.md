# Fixture: cost-control

Minimal workspace opened by the `cost-control` flow (`scripts/ui/flows/cost-control.mjs`)
when it launches the real Code OSS fork.

Contents:

- `package.json` — makes this directory a real workspace folder the fork can open.
- `sample-session.json` — sample Obra session/cost data shape the future
  cost-control screen is expected to read once the product extension exists.

Purpose: give the flow a small, deterministic workspace so the window title
contains "cost-control" (the flow verifies the fixture — not the fork sources —
is open) and so the eventual product screen has realistic data to render.
