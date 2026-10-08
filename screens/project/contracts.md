---
id: PV-05
frameName: "PV-05 · Contratos"
page: "02 · Proyecto"
status: draft
rules: [L1-93, L1-99, L1-102, L1-103, L1-104, L1-106, L3-20]
---

# PV-05 · Contratos

## What it is

The subcontract contracts of the project. The ERP raises a contract (L1-93) with one socio acting as subcontratista, one free-text category, exactly one contract amount in the currency of the project, and at least one covered budget line. The contract declares one state (L1-99); only a vigente contract accepts certificates. The control shows the contract amount, the certified amount, the paid amount and the two available amounts (L3-20, L1-103, L1-104, L1-106). An increase records the previous amount and the new amount (L1-102).

## Must show

- The list of contracts of the project, each with its state, and the editor: one socio as subcontratista, one free-text category, exactly one contract amount in the currency of the project, and at least one covered budget line.
- One state per contract: borrador, vigente, cerrado (L1-99), with the transitions the current state allows; a closed contract keeps its certified and paid history.
- The control (L3-20): contract amount, certified amount (L1-103), paid amount, available to certify (L1-104, contract minus certified) and available to pay (L1-106, certified minus paid); only a vigente contract exposes the certificate path.
- The increase flow, which records the previous amount and the new amount (L1-102); the approval of a certificate never pushes the certified amount above the contract amount, and the refusal names the amount that would pass it.

## States

- **Vacío** — no contract yet; the copy offers one next action.
- **Cargando** — the application reads the folder of the project.
- **Error** — the folder is unreadable; the copy offers a retry.
- **Borrador** — the user edits the contract.
- **Vigente y cerrado** — a vigente contract accepts certificates; a closed contract accepts no more and keeps its history.
- **Aumentar monto** — the increase flow shows the previous amount and the new amount (L1-102).

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Contratos |
| action.new | Nuevo contrato |
| field.partner | Socio |
| field.category | Categoría |
| field.amount | Monto del contrato |
| field.coveredLines | Líneas del presupuesto cubiertas |
| column.state | Estado |
| state.draft | Borrador |
| state.current | Vigente |
| state.closed | Cerrado |
| action.increase | Aumentar monto |
| control.contract | Monto del contrato |
| control.certified | Certificado |
| control.paid | Pagado |
| control.availableToCertify | Disponible para certificar |
| control.availableToPay | Disponible para pagar |
| increase.previous | Monto anterior |
| increase.new | Monto nuevo |
| note.rules | Solo un contrato vigente acepta certificados y un certificado no puede superar el monto del contrato. |
| empty.title | Todavía no hay contratos |
| error.title | No se pudieron cargar los contratos |
| error.action | Reintentar |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The list, the editor, the control and the increase flow have a keyboard path, with a visible focus indicator.
- The control is derived; no control edits the certified, paid or available amounts, and a state change or a recomputed control updates in place, without motion.

## Done when

- [ ] Every contract shows one subcontratista, a free-text category, one amount, at least one covered line and one state.
- [ ] The control shows the five amounts and both formulas hold.
- [ ] Only a vigente contract accepts a certificate, the closed contract keeps its history, and an increase records the previous amount and the new amount.
- [ ] Copy matches the table above character for character.
