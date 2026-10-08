---
id: CV-03
frameName: "CV-03 · Flujo de caja"
page: "01 · Empresa"
status: draft
rules: [L3-32, L3-33, L1-144, L1-145, L1-146, L1-147, L1-148, L1-149]
---

# CV-03 · Flujo de caja

## What it is
The cashflow of the company for one period (L3-33). The company holds the information that crosses its projects (L1-144). The report shows one row for every currency; each row holds the money that entered, the money that left and the net (L3-32, L1-148, L1-149). Every amount keeps the currency of its project and the report never converts (L1-145, L1-146, L1-147).

## Must show
- The report for one period; the default is the current month and the user can choose any month (L3-33).
- One row per currency with the money that entered, the money that left and the net (L3-32).
- The money that entered: the sum of the registered collections of that currency (L1-148).
- The money that left: the sum of the registered payments of that currency (L1-149).
- One total for every currency of the projects in the report; no conversion between currencies (L1-146, L1-147).
- Every amount keeps the currency of its project (L1-145).
- A negative net with its minus sign.
- The note about grouped amounts and no conversion, always visible.

## States
- **Vacío** — no movements in the chosen period.
- **Neto negativo** — a currency closes with a net below zero.
- **Cargando** — the application reads the collections and the payments.
- **Error** — a project folder is unreadable; the total can be incomplete; the screen offers a retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Flujo de caja |
| period.default | Octubre 2026 |
| period.aria | Elegir período |
| column.currency | Moneda |
| column.in | Entró |
| column.out | Salió |
| column.net | Neto |
| currency.usd | Dólar (USD) |
| currency.pyg | Guaraní (PYG) |
| note | Los montos se agrupan por moneda. No se convierten. |
| empty.title | Sin movimientos en {período} |
| empty.body | Registrar cobros y pagos en los proyectos hace que el flujo aparezca acá. |
| error.title | Un proyecto no se pudo leer |
| error.body | El total puede estar incompleto. |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The table is read-only; selecting a row does nothing.
- The screen never offers a currency conversion (L1-147).

## Done when
- [ ] Two currencies with movements are drawn with entered, left and net.
- [ ] A negative net is drawn with its minus sign.
- [ ] Choosing another month updates the report (L3-33).
- [ ] The copy matches the table, character for character.
