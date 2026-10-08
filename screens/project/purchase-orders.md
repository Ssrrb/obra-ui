---
id: PV-04
frameName: "PV-04 · Órdenes de compra"
page: "02 · Proyecto"
status: draft
rules: [L1-83, L1-89, L1-90, L1-92]
---

# PV-04 · Órdenes de compra

## What it is

The purchase orders of the project. The ERP raises an order (L1-83); it buys inputs from one socio acting as proveedor, holds at least one input with a quantity and declares one state (L1-89). The approval commits the budget (L1-90) and the receipt executes it (L1-92). In a project whose policy requires a partida, an order comes from an issued partida; otherwise it comes from budget lines. Only a draft can be deleted, and the MVP has no cancellation state.

## Must show

- The list of purchase orders of the project, each with its state.
- The editor: one socio as proveedor, at least one input with a quantity, and the origin; an issued partida when the policy requires one, otherwise budget lines.
- One state per order: borrador, aprobado, emitido, recibido (L1-89), with the transitions the current state allows.
- The effect of the approval on the committed amount (L1-90) and of the receipt on the executed amount (L1-92); delete only while the order is a draft, and the MVP offers no cancellation state.

## States

- **Vacío** — no order yet; the copy offers one next action.
- **Cargando** — the application reads the folder of the project.
- **Error** — the folder is unreadable; the copy offers a retry.
- **Borrador** — the user edits the order; the order can be deleted.
- **Aprobado** — the order commits the budget (L1-90); delete is gone.
- **Emitido** — the user sent the order to the socio.
- **Recibido** — the socio delivered the inputs; the order executes the budget (L1-92).

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Órdenes de compra |
| action.new | Nueva orden de compra |
| field.supplier | Proveedor |
| field.origin | Origen |
| origin.request | Partida emitida |
| origin.budget | Líneas del presupuesto |
| column.input | Insumo |
| column.quantity | Cantidad |
| column.state | Estado |
| state.draft | Borrador |
| state.approved | Aprobado |
| state.issued | Emitido |
| state.received | Recibido |
| action.approve | Aprobar |
| action.issue | Emitir |
| action.receive | Recibir |
| action.delete | Eliminar |
| note.effect | Aprobar la orden compromete el presupuesto; recibir la ejecuta. |
| empty.title | Todavía no hay órdenes de compra |
| error.title | No se pudieron cargar las órdenes de compra |
| error.action | Reintentar |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Approval and receipt change derived amounts; the state chip and the note carry the meaning, never the color alone; only the draft offers Eliminar.
- The list, the editor and every state action have a keyboard path with a visible focus indicator; state changes and the amounts update in place, without animation.

## Done when

- [ ] Every order shows one proveedor, at least one input with a quantity, an origin and one of the four states, with the actions of its current state.
- [ ] Approval moves the committed amount and receipt moves the executed amount; before approval the committed amount does not change.
- [ ] Delete is offered only on a draft, and no cancellation state exists.
- [ ] Copy matches the table above character for character.
