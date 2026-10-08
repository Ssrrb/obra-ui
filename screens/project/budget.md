---
id: PV-01
frameName: "PV-01 · Presupuesto"
page: "02 · Proyecto"
status: draft
rules: [L3-09, L3-10, L3-11, L1-31, L1-53, L1-55, L1-57, L1-58, L1-59]
---

# PV-01 · Presupuesto

## What it is

The budget of the project. A project holds exactly one budget (L1-31) and this screen shows it as a grid with its lines and their amounts (L3-09). Every amount keeps two decimals (L1-58); only the contract amount is rounded (L1-59). The user names a work unit for a line (L3-10) and prints the budget (L3-11).

## Must show

- The single budget of the project; a second budget is never offered (L1-31).
- The tree of budget lines with the kinds rubro, subrubro and línea; per line: code, description, unit of measure, quantity, unit price and amount.
- Add, change and delete a line of the grid (L3-09); one work unit field per line, empty when the user names no work unit (L3-10).
- One surcharge chain from the project, applied in the declared order, with its tax line; the contract amount is the direct cost plus the total indirect.
- Per line: committed (L1-53), executed, measured (L1-55) and available (L1-57); available equals amount minus committed, and an overcommitment shows a negative available amount.
- Every amount with two decimals (L1-58); only the contract amount is rounded (L1-59); print the budget (L3-11) and import it from an Excel workbook, a file of the engine or a BC3 file.

## States

- **Cargando** — the application reads the budget file.
- **Error del motor** — the calculation engine fails; the grid keeps the last readable data and the copy offers a retry.
- **Panel de recargos** — the surcharge chain of the project shown in declared order.
- **Sobrecompromiso** — a line holds a negative available amount; the minus sign and the label carry the meaning, not the color alone.

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Presupuesto |
| column.code | Código |
| column.description | Descripción |
| column.unit | Unidad de medida |
| column.quantity | Cantidad |
| column.unitPrice | Precio unitario |
| column.amount | Monto |
| column.workUnit | Unidad de trabajo |
| column.committed | Comprometido |
| column.executed | Ejecutado |
| column.measured | Medido |
| column.available | Disponible |
| total.direct | Costo directo |
| total.indirect | Indirectos totales |
| total.contract | Monto del contrato |
| action.addLine | Agregar línea |
| action.import | Importar |
| action.print | Imprimir |
| error.engine | No se pudo calcular el presupuesto. |
| action.retry | Reintentar |
| overcommitment | Sobrecompromiso |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Money columns use tabular figures and keep two decimals; only the contract amount is rounded (L1-59); an overcommitment travels with the minus sign and the label, never the color alone (L1-57).
- The whole grid is editable by keyboard, with visible focus; a recompute rewrites values in place, without motion.

## Done when

- [ ] Exactly one budget is shown and a second one is never offered.
- [ ] Every line shows code, description, unit of measure, quantity, unit price and amount, and the work unit field can stay empty.
- [ ] Committed, executed, measured and available show per line; available equals amount minus committed and goes negative on overcommitment.
- [ ] Every amount shows two decimals, only the contract amount is rounded, and print plus the three import formats are reachable.
- [ ] Copy matches the table above character for character.
