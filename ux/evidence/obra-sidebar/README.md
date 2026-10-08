# Native sidebar review evidence

Captured from the built Code OSS candidate upstream integration branch using
ordinary code.sh discovery with a disposable profile and no extension development
flag. The product PR isolates the same self-contained extension on main; its
runtime checks were performed on this candidate build, not a new main build.

`host-report.json` records eight native checks and the six theme captures.
`unit-tests.log` records the five package tests. `packaging.json` records actual
VSIX archive contents and the normal built-in packaging selection. Factory
failures are preserved in `factory-checks.log`; `ledger.json` confirms the
canonical baseline was not changed. Human visual approval remains pending.
