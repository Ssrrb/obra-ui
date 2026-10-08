---
id: CV-06
frameName: "CV-06 · Nuevo proyecto"
page: "01 · Empresa"
status: draft
rules: [L3-21, L3-22, L3-23, L3-08, L3-24]
---

# CV-06 · Nuevo proyecto

## What it is
The template that creates a project. It asks exactly the seven questions of L3-21 and nothing else, and every question offers a recommended value (L3-08). When the user accepts the import, the application asks for a budget file before it writes the project folder (L3-22). The import accepts an Excel workbook, a file of the engine and a BC3 file (L3-23). The application never applies the default surcharge chain of the engine (L3-24).

## Must show
- The seven questions: name of the project, name of the obra, purchasing flow policy, currency, tax rate, surcharges and whether to import a budget (L3-21).
- One recommended value per question (L3-08): the obra takes the project name, the policy starts at Con partida, the currency at Dólar, the tax rate at 10, the surcharges at Sin definir todavía, and the import off.
- The chip Recomendado on each suggested value.
- The surcharges field read-only with the value Sin definir todavía; the recommended surcharges are pending.
- The import switch; when it is on, the application asks for a budget file before it writes the project folder (L3-22).
- The accepted files: an Excel workbook, a file of the engine and a BC3 file; after a file is picked the screen shows its name and a remove action (L3-23).
- The application never applies the default surcharge chain of the engine (L3-24).
- The validation of the project name and, when the import is on, of the file.

## States
- **Sin importación** — default; the screen writes no file.
- **Con importación** — the switch is on; the screen asks for the budget file (L3-22).
- **Error** — the project name is empty or the import is on with no file; the screen shows the message of the field.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Nuevo proyecto |
| field.name | Nombre del proyecto |
| field.namePlaceholder | Presupuesto Zapote |
| field.obra | Nombre de la obra |
| field.policy | Política de compras |
| field.policy.con | Con partida |
| field.policy.sin | Sin partida |
| field.policy.help | Con partida: presupuesto, partida, orden de compra, recepción. |
| field.currency | Moneda |
| field.currency.usd | Dólar |
| field.currency.pyg | Guaraní |
| field.tax | IVA |
| field.tax.suffix | % |
| field.surcharges | Recargos |
| field.surcharges.value | Sin definir todavía |
| field.surcharges.help | Los valores recomendados de recargos están pendientes. |
| import.switch | Importar presupuesto ahora |
| import.dropzone | Elige un archivo Excel, BC3 o del motor |
| import.pick | Seleccionar archivo |
| import.remove | Quitar archivo |
| recommended | Recomendado |
| recommended.tooltip | Valor sugerido por Obra Studio. |
| button.cancel | Cancelar |
| button.create | Crear proyecto |
| error.name | Escribe un nombre para el proyecto. |
| error.file | Elige un archivo para importar. |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The template must not ask for anything else (L3-21); do not add fields.
- The recommended values are suggestions; the user can change them (L3-08).

## Done when
- [ ] All seven questions are drawn, and only those.
- [ ] Every question shows its recommended value and the chip Recomendado.
- [ ] Import off and import on with a file both exist, plus the two validation messages.
- [ ] The copy matches the table, character for character.
