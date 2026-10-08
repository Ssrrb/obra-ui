---
id: PV-10
frameName: "PV-10 · Insumos"
page: "02 · Proyecto"
status: draft
rules: [L1-70, L1-71, L1-72, L1-73, L1-75]
---

# PV-10 · Insumos

## What it is
The list and the editor of the inputs of the project and their price list. Each input belongs to exactly one project (L1-70) and declares one name (L1-71), exactly one unit of measure (L1-72) and exactly one price (L1-73). The project holds exactly one price list with one price per input (L1-75). The MVP keeps no stock.

## Must show
- One row per input: name, unit of measure and price.
- The editor declares one name (L1-71), exactly one unit of measure (L1-72) and exactly one price (L1-73).
- The input belongs to the project, and every input of the project appears once (L1-70).
- The project holds one price list with one price per input (L1-75); an edit updates that price and never adds a second price.
- The price uses the currency of the project and shows two decimals.
- The screen shows no stock, no quantity on hand and no movement; the MVP keeps no stock.

## States
- **Vacío** — the project holds no inputs; the state offers one next action: add the first input.
- **Cargando** — the app reads the input files of the project.
- **Error** — an input file cannot be read; the message names the failure and offers retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Insumos |
| button.new | Agregar insumo |
| column.name | Nombre |
| column.unit | Unidad de medida |
| column.price | Precio |
| field.name | Nombre |
| field.unit | Unidad de medida |
| field.price | Precio |
| field.price.help | El precio usa la moneda del proyecto. |
| dialog.new | Nuevo insumo |
| dialog.edit | Editar insumo |
| action.save | Guardar |
| action.cancel | Cancelar |
| empty.title | Todavía no hay insumos |
| empty.body | La lista de precios del proyecto guarda un precio por insumo. |
| error.title | No se pudieron cargar los insumos |
| error.action | Reintentar |
| error.name | Escribe un nombre para el insumo. |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Every control is keyboard reachable with a visible focus ring; the editor traps focus and returns it to the row that opened it.
- Money uses tabular numbers and two decimals; the price never converts to another currency.
- Motion stays restrained: no entry animation on the list; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows name, unit of measure and price for every input.
- [ ] The editor declares one name, one unit of measure and one price.
- [ ] One price list holds one price per input, and no stock or quantity appears.
- [ ] Copy matches the table above character for character.
