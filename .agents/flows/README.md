# Flows

Five flows. Each one is a state machine over files in git, with gates that
leave evidence. A flow is not a document an agent reads for inspiration; it is
the set of stages, permissions and checks a run must pass.

| Flow | File | One line |
|---|---|---|
| A | `design-interface.md` | Turn a rule into an approved surface contract and reviewed frames. |
| B | `data-model.md` | Turn a domain rule into a versioned project-folder schema and fixtures. |
| C | `implement-feature.md` | Turn an approved contract into a PR with evidence. |
| D | `upstream-sync.md` | Keep the fork a bounded distance from `microsoft/vscode`. |
| E | `test-suites.md` | Turn every rule into a check, and every production error into a test. |

---

## The shared envelope

Every flow runs the same seven stages. A stage that does not apply says so in
the run record; it is never silently skipped.

```
1 BRIEF      what and why, with cited rule ids            → brief.md
2 PLAN       files to touch, checks to run, cost to merge → plan.md
3 EXECUTE    the work, in a worktree this run owns        → the diff
4 VERIFY     the narrowest validation that proves it      → evidence/*
5 REVIEW     a different context, read-only, writes a report → verdict.md
6 EVIDENCE   attach everything to the PR                  → PR body + artifacts
7 DISPOSE    merge, hold, or report the blocker           → state.json
```

### The brief (stage 1)

A brief is the only legitimate input to a run. It holds:

```yaml
run: 2026-10-08-cost-control-host-bridge
flow: implement-feature
intent: one sentence, in the words of the user, not of the agent
rules:                      # from contracts/rules-index.yaml
  - id: L3-19
    state: draft            # draft → needs an approval commit or the experimental tag
    coverage: none
contract: ui/ux/cost-control.yaml       # required when the change has a surface
schema: null                            # required when the change has state
writes:                                 # paths this run may create or modify
  - app/extensions/obra-studio/src/costControl/**
forbidden:                              # everything else, and explicitly:
  - app/src/vs/**                       # HG-2
  - design/design/PRINCIPLES.md         # an amendment, not a task
plane: workstation
validation:
  - node factory/scripts/check-factory.mjs
  - cd ../vscode && ./scripts/test.sh --run extensions/obra-studio/src/test/costControl.test.ts
  - cd ../vscode/extensions/obra-studio/e2e && npx e2e run --grep cost-control   # T2/T3 tier, not per PR
budget:
  model: frontier
  max_tool_calls: 120
  stop_conditions:
    - the live code does not match an assumption in this brief
    - a validation command fails twice after a reasonable fix
    - the work needs a path outside `writes`
    - the run cannot produce concrete evidence for a claim
```

Three rules make the brief load-bearing:

1. **A brief with no rule id is refused.** Work that implements nothing in the
   specification does not enter the factory; it goes to a human.
2. **A draft rule blocks or tags.** If any cited rule is `draft`, the run
   either carries an approval commit for it (HG-1 style, one rule at a time) or
   it is labelled `experimental` and excluded from the release gates. There is
   no third option, because building silently on an unapproved rule is how an
   agent factory produces confident nonsense.
3. **`forbidden` is explicit.** An agent that needs a forbidden path stops and
   reports; it does not widen its own scope.

### Where the state lives

| Thing | Where | Why |
|---|---|---|
| The task | a branch, `flow/<id>/<slug>` | it is versioned, diffable and abandonable |
| The deliverable | a pull request | the only artifact a human reviews |
| A gate | a required check on the PR | green/red is not a matter of opinion |
| The queue | GitHub labels + a Project column | visible without new tooling |
| The evidence | PR body + uploaded job artifacts | immutable, tied to a commit |
| The run record | a machine-readable PR comment, edited in place | an agent can read what a previous agent did |
| Scheduling state | SQLite on the control plane | disposable by design |

The run record comment is JSON, one per run:

```json
{"run":"2026-10-08-cost-control-host-bridge","flow":"implement-feature",
 "stage":"review","gates":{"L1":"pass","L2":"pass","L4":"not-implemented"},
 "rules":["L3-19"],"evidence":["artifact:verify-2026-10-08","screenshot:cost-control-empty"],
 "models":{"frontier":1,"local":7},"toolCalls":84,"actor":"feature-agent",
 "blockedOn":null,"updatedAt":"2026-10-08T14:22:07-03:00"}
```

`not-implemented` is a legal value. `../ui/scripts/ui/run-flow.mjs` already
returns exit code 2 for it and refuses to invent a pass. Every flow inherits
that discipline: **an absent feature is reported as absent, never as green.**

### Labels

| Label | Meaning |
|---|---|
| `flow/design`, `flow/data-model`, `flow/feature`, `flow/sync`, `flow/test` | which flow opened it |
| `needs/hg-1`, `needs/hg-2`, `needs/hg-3` | waiting on a human gate |
| `needs/rule-approval` | a cited rule is draft and needs one approval commit |
| `experimental` | built on a draft rule; excluded from release gates |
| `core-patch` | touches `src/vs/`, `build/`, `.github/`, `product.json`, `remote/` |
| `module` | touches only `extensions/obra-studio/` — the cheap kind |
| `evidence/incomplete` | a gate could not run; the PR says why |
| `quarantine/flaky` | a flow fails without a product cause; the watchdog parked it |

---

## Gate vocabulary

| Prefix | Meaning | Who runs it |
|---|---|---|
| **L1–L7** | the test layers (`test-suites.md`) | control plane (L1–L2), workstation (L3–L7) |
| **HG-1..3** | a human gate | the founder |
| **SG-1..8** | a ship gate (`contracts/release-manifest.yaml`) | the ship flow |
| **PL-nnn** | a patch-ledger entry | the ledger |
| **L0-nn..L3-nn** | a wiki rule | the wiki |

A gate name is stable. An agent cites a gate by name in its report; it never
paraphrases one.

---

## The honesty rules

These are the only rules that apply to every flow, every agent, every plane.
They exist because an autonomous factory fails by *reporting success*, not by
failing.

1. **Full failure output is preserved.** A truncated stack, a summarized test
   failure, or "some tests failed" is not evidence. Paste the output or link
   the artifact.
2. **A check that could not run is reported as unknown.** Unknown is not pass.
   Unknown is not fail. Unknown names what was missing (a dependency, a
   display, a token, a build).
3. **An agent never approves its own work.** Implementer ≠ reviewer ≠ approver.
   The reviewer holds a fresh context and read-only access.
4. **A claim needs an artifact.** "The flow passes" means a `report.json` and a
   screenshot are attached. "The tokens are in sync" means `check-factory --only 8`
   printed PASS on this commit.
5. **Scope does not widen silently.** Needing a forbidden path is a stop
   condition, reported in the run record with `blockedOn`.
6. **Debt may exist; it may not grow.** Both ratchets (coverage, ledger budget)
   fail a run that moves a number the wrong way.
7. **The narrowest validation that proves the change.** Not the whole suite.
   `open-swe`'s rule, adopted: run what the change touches, preserve the
   failure output completely, and say whether the signal looks flaky,
   environmental or product-relevant.
