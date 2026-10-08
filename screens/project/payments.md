---
id: PV-07
frameName: "PV-07 · Pagos"
page: "02 · Proyecto"
status: draft
rules: [L1-128, L1-133, L1-138, L1-140, L1-141]
---

# PV-07 · Pagos

## What it is
The list and the editor of the payments of the project. A payment pays an approved certificate and only the ERP registers it (L1-128). It declares one method from transferencia, cheque and efectivo (L1-133). A registered payment never changes (L1-138); a cancellation records one reason (L1-140) and the screen refuses a value above what remains payable (L1-141).

## Must show
- One row per payment: number, certificate, date, method, reference, amount and state; selecting the row opens the payment. The editor names exactly one certificate and shows what remains payable of that certificate; only approved certificates are offered.
- The amount is greater than zero and never above what remains payable; the screen refuses a value above the ceiling and says how to fix it (L1-141).
- The payment declares exactly one method from transferencia, cheque and efectivo (L1-133), one reference and one date.
- The payment holds zero or more evidence files.
- Actions by state: borrador edits or registers; registrado never changes (L1-138), is never deleted and offers only anular; anular requires one reason and states that the payment keeps its record and stops counting (L1-140); anulado does not count.

## States
- **Vacío** — the project holds no payments; the state offers one next action: register the first payment.
- **Cargando** — the app reads the payment files of the project.
- **Error** — a payment file cannot be read; the message names the failure and offers retry.
- **Borrador** — the user edits the payment.
- **Registrado** — the payment counts, never changes and is never deleted; the only action is anular.
- **Anulado** — the payment keeps its record and does not count; a new payment corrects the mistake.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Pagos |
| button.new | Nuevo pago |
| column.number | Número |
| column.certificate | Certificado |
| column.amount | Monto |
| column.state | Estado |
| state.draft | Borrador |
| state.registered | Registrado |
| state.cancelled | Anulado |
| action.register | Registrar |
| action.cancel | Anular |
| field.certificate | Certificado |
| field.amount | Monto |
| field.remaining | Disponible para pagar |
| field.method | Método |
| field.method.transferencia | Transferencia |
| field.method.cheque | Cheque |
| field.method.efectivo | Efectivo |
| field.reference | Referencia |
| field.date | Fecha |
| evidence.add | Adjuntar evidencia |
| cancel.reason | Motivo de la anulación |
| error.ceiling | El monto supera lo que queda por pagar del certificado. Ajusta el monto. |
| empty.title | Todavía no hay pagos |
| error.title | No se pudieron cargar los pagos |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The state never travels by color alone; every control is keyboard reachable with a visible focus ring, and the cancel reason field keeps its visible label.
- Money uses two decimals and the currency of the project; the reference and the date stay visible after registration.
- Motion stays restrained: no entry animation on the list or the rows; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows one row per payment with certificate, date, method, amount and state.
- [ ] The editor shows the certificate, what remains payable, the amount, the method, the reference, the date and the evidence.
- [ ] The three states show the actions above; registrado offers only anular, and anular requires a reason.
- [ ] The ceiling refusal explains how to fix the amount.
- [ ] Copy matches the table above character for character.
