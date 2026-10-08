# Flow A — Design an interface

Turn a rule into an approved surface. The exit artifact is a UX contract with a
human signature, reviewed Penpot frames, and a registry entry that names where
the surface will live in the fork. Nothing downstream accepts a UI task without
that artifact.

**Trigger** — a rule in `../wiki/docs/product/` or `../wiki/docs/domain/` needs
a surface, or a roadmap initiative names one.
**Plane** — mac (Penpot, authoring) + control (checks).
**Human gate** — HG-1, contract freeze.
**Authority** — `../ui/design/PRINCIPLES.md` (the ten rules),
`../ui/design/SURFACE_RULES.md` (the rank order),
`../ui/design/COMPONENT_RULES.md` (layers, naming, states),
`../ui/design/TOKENS.md`.

---

## Stages

### A1 — Intent

Read the rules the surface must satisfy and write them down by identifier.

```sh
cd ../wiki && rg -n '^### L3-' docs/product/mvp.mdx
cd ../factory && rg -n 'id: L3-19' -A 6 contracts/rules-index.yaml
```

Output: the `rules:` list of the brief. A surface that satisfies no rule does
not exist; send it back.

The `spec-agent` writes the intent into the contract header, not into a new
document. The wiki already holds the requirement — the contract cites it.

### A2 — Surface decision

Apply `SURFACE_RULES.md` in rank order and record every rejection. This is
Principle 1 (native before webview) and it is the most commonly skipped step,
so the check for it is structural: a contract with `surface_type: webview-*`
and an empty `native_options_considered` list fails L1 check 5.

The rank order, restated so an agent cannot rationalize past it:

| Rank | Surface | Never for |
|---|---|---|
| 1 | Command palette | long-form input |
| 2 | Quick pick | multi-step forms |
| 3 | Tree view | free text editing |
| 4 | Editor | simple confirmations |
| 5 | Status bar | anything needing labels |
| 6 | Notification | data entry |
| 7 | Webview panel | anything a native surface can do |
| 8 | Webview view | anything a tree view can do |

### A3 — Frames

The five Penpot agents run against the file `Obra Studio · MVP` through the
Penpot MCP. They already exist with deny-by-default permissions; keep them
exactly as they are and move them from `../wiki/.opencode/agents/` to
`../ui/.opencode/agents/`, because the design work now lives in `../ui`.

| Agent | Writes | May not |
|---|---|---|
| `penpot-builder` | frames in the Penpot file | touch a token source, edit code |
| `penpot-auditor` | `../ui/design/reports/<surface>/audit.md` | edit a frame |
| `design-reviewer` | `../ui/design/reports/<surface>/verdict.md` | edit a frame, run a shell beyond `check.sh` |
| `token-engineer` | `../ui/design/tokens/**`, Penpot token sets | invent a color, hand-edit `generated/` |
| `component-mapper` | `../ui/design/penpot-map.json` | edit a component |

Order matters and it is the order in `docs/execution/design-system.mdx`:
build → audit → review. A frame reaches `reviewed` only when the audit is clean
**and** the reviewer filed a verdict. The auditor and the reviewer are
different contexts; the builder never audits its own frame.

Pages: `01 · Empresa`, `02 · Proyecto`, `03 · Componentes`, `04 · Impresos`.
Frame ids are stable and appear in the contract, the registry and the e2e flow:
`CV-01 · Proyectos`, `PV-03 · Presupuesto`, and so on.

### A4 — Tokens

Canonical source is DTCG in `../ui/design/tokens/{primitive,semantic,component,vscode}.json`.
Generated output is `../ui/design/generated/{tokens.css,tokens.ts,tokens.md,penpot-tokens.json,vscode-fallback.css}`.

```sh
cd ../ui && pnpm ui:tokens          # regenerate; commit the result
cd ../factory && node scripts/check-factory.mjs --only 8   # proves no drift
```

A new color is a **token change**, which is a design-system change, which is a
separate PR from the surface that needs it. 113 tokens exist today; the
contrast floor is enforced (`06d5eb8 Raise dark border.control over the 3:1
non-text floor`). Two Penpot catalog limits are known and stay canonical in
DTCG only: shadows reject a negative spread, and motion tokens have no Penpot
type.

### A5 — Registry

`../ui/design/penpot-map.json` is the one mapping registry. It links four names
per component — Penpot id, `@obra/ui` export, custom-element tag, story path —
and it is what L1 check 6 validates against the code (every custom element
defined in `packages/obra-ui/src` must appear in it, and every entry must be
exported by `index.ts`).

Two corrections to make once, because the docs and the code disagree:

1. `docs/execution/design-system.mdx` reports the registry as Done at
   `design/mapping/penpot-vscode.json`. That file was deleted with the
   `../wiki/design/` folder. Update the document to name
   `../ui/design/penpot-map.json`.
2. The `component-mapper` agent's spec expects `designSystemVersion` and a
   per-component `target` / `implementation` / `justification`. `penpot-map.json`
   has none of them. Add the three fields — they are what makes the registry a
   contract with the fork rather than a list of names:

```json
{
  "designSystemVersion": "0.1.0",
  "components": {
    "obra/data-table": {
      "package": "@obra/ui", "component": "DataTable",
      "tag": "obra-data-table", "story": "Patterns/DataTable",
      "target": "webview",
      "implementation": "app/extensions/obra-studio/src/costControl/grid.ts",
      "justification": "1000-row numeric grid with inline editing; no native surface composes it (ux/cost-control.yaml)",
      "states": ["default", "loading", "empty", "error", "disabled", "focus-visible", "extreme-content"]
    }
  }
}
```

`target` is `native | webview | core`. A non-native target without a
justification fails the check. This is L0-03 (the conformance criterion) made
mechanical.

### A6 — Contract freeze (HG-1)

Copy `../ui/ux/CONTRACT_TEMPLATE.yaml` to `../ui/ux/<surface-id>.yaml` and fill
every field **except** `review.approved_by` and `review.approved_at`. Then a
human — a design reviewer who is not the implementer — fills them.

Required, checked by L1 check 5:

- `surface.id` (stable, used by the harness `?surface=`, the CSS class, the e2e
  flow name and the registry)
- `surface_choice.native_options_considered[]` with a `rejected_because` each,
  and `webview_reason` when the surface is a webview
- `components.reused[]` with the search that was performed, and
  `new_justification` for anything new (Principle 6)
- `states`: `loading`, `empty`, `error`, `permission_denied`, `extreme_content`
  (long labels, large dataset, small dataset, RTL, high contrast) — Principle 8
- `keyboard[]`: at minimum Tab, ArrowUp/Down, Enter, Escape
- `data.host_messages[]` and `data.fixtures[]` — the typed bridge, never a
  direct reach into the extension host
- `review.e2e_flow`: the app-repository test that will prove it in the real
  host — `app/extensions/obra-studio/e2e/tests/<surface-id>.e2e.ts`, run with
  `npx e2e run --grep <surface-id>`. The suite lives in the app repo and runs
  on a tier, not on every PR (`test-suites.md`). The old value in
  `../ui/ux/cost-control.yaml` (`scripts/ui/run-flow cost-control`) names a
  harness that retires; update it when the suite is ported.

`../ui/ux/cost-control.yaml` is the reference: 300+ lines, eight native
surfaces considered and rejected by name, every state enumerated, and
`approved_by` deliberately empty with an `open_gates` section listing what is
not yet verified. **That is the standard.** It is waiting on HG-1 today.

---

## Gates

| Gate | Command / actor | Blocks |
|---|---|---|
| A-G1 wiki form | `cd ../wiki && sh scripts/check.sh` | a spec change with a broken form |
| A-G2 token reproducibility | `node factory/scripts/check-factory.mjs --only 8` | stale `design/generated` |
| A-G3 registry agreement | `... --only 6` | a component with no map entry, or a map entry with no export |
| A-G4 contract completeness | `... --only 5` | a missing state, keyboard map, or e2e flow |
| A-G5 no forbidden style | `... --only 7` | a hardcoded color or a toolkit import |
| A-G6 audit clean | `penpot-auditor` report | a frame that violates the checklist |
| **A-G7 HG-1** | human fills `review.approved_by` | everything downstream |

## Evidence

`../ui/design/reports/<surface-id>/{audit.md,verdict.md}`, the frame links, the
contrast report, the regenerated `tokens.md` row count, and the contract itself.
All of it goes into the PR body of the design PR.

## Failure paths

| Situation | What the flow does |
|---|---|
| No native surface fits and no justification can be written | Stop. The surface is not significant UI; ask whether it is needed at all. |
| A needed token does not exist | Split: one PR for the token (design-system change), one for the surface. Never inline a color. |
| A needed component does not exist | The contract records the search and `new_justification`; the component is built in `@obra/ui` first, with a story, in its own PR. |
| The auditor and the reviewer disagree | Escalate to the human. Do not average the two verdicts. |
| A rule the surface implements is `draft` | Label `needs/rule-approval`. The design may proceed; the implementation may not ship without the approval commit. |
