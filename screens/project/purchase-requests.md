---
id: PV-03
frameName: "PV-03 · Partidas"
page: "02 · Proyecto"
status: draft
rules: [L1-76, L1-80, L1-81, L1-82]
---

# PV-03 · Partidas

## What it is

The partidas of the project. The ECMS raises a partida (L1-76) only in a project whose purchasing flow policy requires one (L1-80). A partida belongs to one work unit and holds inputs with quantities. Its state is borrador, aprobado or emitido (L1-81). The approval does not change the committed amount of the budget (L1-82), and an issued partida is the origin of a purchase order.

## Must show

- The list of partidas of the project, each with its state.
- The screen and its entry points exist only when the policy of the project requires a partida (L1-80).
- The editor: one work unit and at least one input with a quantity.
- One state per partida: borrador, aprobado, emitido (L1-81), with the transitions the current state allows.
- A note that approval does not commit the budget (L1-82): the committed amount stays untouched.
- An issued partida is the origin of a purchase order.

## States

- **Vacío** — no partida yet; the copy explains what a partida groups and offers one next action.
- **Cargando** — the application reads the folder of the project.
- **Error** — the folder is unreadable; the copy offers a retry.
- **Borrador** — the user edits the partida and its inputs.
- **Aprobado** — the user confirmed the partida; the committed amount stays unchanged (L1-82).
- **Emitido** — the user sent the partida; a purchase order can come from it.

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Partidas |
| action.new | Nueva partida |
| column.workUnit | Unidad de trabajo |
| column.input | Insumo |
| column.quantity | Cantidad |
| column.state | Estado |
| state.draft | Borrador |
| state.approved | Aprobado |
| state.issued | Emitido |
| action.approve | Aprobar |
| action.issue | Emitir |
| action.createOrder | Crear orden de compra |
| note.noCommitment | Aprobar una partida no compromete el presupuesto. |
| empty.title | Todavía no hay partidas |
| empty.body | Una partida agrupa los insumos de una unidad de trabajo. |
| error.title | No se pudieron cargar las partidas |
| error.action | Reintentar |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- When the policy does not require a partida, the screen and its entry points do not exist; the interface never shows a disabled version of them (L1-80).
- The list, the editor and every state action have a keyboard path, with a visible focus indicator.
- The approval note stays visible while the partida is not issued (L1-82).
- A state change updates the document in place, without a transition animation.

## Done when

- [ ] The screen exists only when the project policy requires a partida.
- [ ] Every partida shows one work unit, at least one input with a quantity and one state.
- [ ] The editor offers the actions the current state allows, and approval leaves the committed amount unchanged.
- [ ] An issued partida exposes "Crear orden de compra".
- [ ] Copy matches the table above character for character.
