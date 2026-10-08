---
id: PV-08
frameName: "PV-08 · Cobros"
page: "02 · Proyecto"
status: draft
rules: [L1-154, L1-160, L1-165, L1-167, L1-168]
---

# PV-08 · Cobros

## What it is
The list and the editor of the collections of the project. A collection records the money that a client pays for the work of an approved certificate, and only the ERP registers it (L1-154). It declares one method from transferencia, cheque and efectivo (L1-160). A registered collection never changes (L1-165); a cancellation records one reason (L1-167) and the screen refuses a value above what remains collectible (L1-168).

## Must show
- One row per collection: number, client, certificate, date, method, reference, amount and state; selecting the row opens the collection.
- The editor names exactly one client of the list of the project and exactly one approved certificate; it shows what remains collectible of that certificate.
- The amount is greater than zero and never above what remains collectible; the screen refuses a value above the ceiling and says how to fix it (L1-168).
- The collection declares exactly one method from transferencia, cheque and efectivo (L1-160), one reference and one date; it holds zero or more evidence files.
- When the project holds no clients, the editor states that a client is needed and points to the list of clients.
- Actions by state: borrador edits or registers; registrado never changes (L1-165), is never deleted and offers only anular; anular requires one reason and states that the collection keeps its record and stops counting (L1-167); anulado does not count.

## States
- **Vacío** — the project holds no collections; the state offers one next action: register the first collection.
- **Cargando** — the app reads the collection files of the project.
- **Error** — a collection file cannot be read; the message names the failure and offers retry.
- **Borrador** — the user edits the collection.
- **Registrado** — the collection counts, never changes and is never deleted; the only action is anular.
- **Anulado** — the collection keeps its record and does not count; a new collection corrects the mistake.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Cobros |
| button.new | Nuevo cobro |
| column.client | Cliente |
| column.certificate | Certificado |
| column.state | Estado |
| state.draft | Borrador |
| state.registered | Registrado |
| state.cancelled | Anulado |
| action.register | Registrar |
| action.cancel | Anular |
| field.client | Cliente |
| field.certificate | Certificado |
| field.amount | Monto |
| field.remaining | Disponible para cobrar |
| field.method | Método |
| field.method.transferencia | Transferencia |
| field.method.cheque | Cheque |
| field.method.efectivo | Efectivo |
| field.reference | Referencia |
| field.date | Fecha |
| cancel.reason | Motivo de la anulación |
| error.ceiling | El monto supera lo que queda por cobrar del certificado. Ajusta el monto. |
| empty.title | Todavía no hay cobros |
| error.title | No se pudieron cargar los cobros |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The state never travels by color alone; every control is keyboard reachable with a visible focus ring, and the cancel reason field keeps its visible label.
- Money uses two decimals and the currency of the project; the reference and the date stay visible after registration.
- Motion stays restrained: no entry animation on the list or the rows; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows one row per collection with client, certificate, date, method, amount and state.
- [ ] The editor shows the client, the certificate, what remains collectible, the amount, the method, the reference, the date and the evidence.
- [ ] The three states show the actions above; registrado offers only anular, and anular requires a reason.
- [ ] A missing client points to the list of clients instead of allowing the collection.
- [ ] Copy matches the table above character for character.
