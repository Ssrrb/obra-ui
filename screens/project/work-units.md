---
id: PV-02
frameName: "PV-02 · Unidades de trabajo"
page: "02 · Proyecto"
status: draft
rules: [L3-19, L1-16, L1-24, L1-30]
---

# PV-02 · Unidades de trabajo

## What it is

The tree of work units of the obra with the economic view on the node itself (L3-19). An obra holds exactly one root work unit (L1-16). The view shows the budget, the committed amount, the executed amount, the measured amount, the available amount, the allocated indirect and the total cost of the node (L3-19). The direct cost is the sum of the amounts of the budget lines that name the unit (L1-24); the total cost adds the allocated indirect (L1-30).

## Must show

- One tree with exactly one root work unit and no second root (L1-16).
- Create, rename, re-parent and delete a work unit.
- The economic view on the node itself, expandable on the node (L3-19).
- The seven values of the view: budget, committed, executed, measured, available, allocated indirect and total cost (L3-19).
- Direct cost equals the sum of the amounts of the budget lines that name the unit (L1-24).
- Total cost equals the direct cost plus the allocated indirect (L1-30).
- A unit with no direct cost shows no allocated indirect.
- The values are derived from the budget and recomputed; the user never types or stores them.

## States

- **Vacío** — the tree holds only the root; the copy invites creating the first unit.
- **Cargando** — the application reads the budget file.
- **Error** — the budget is unreadable; the tree stays and the economic view offers a retry.
- **Vista económica expandida** — the economic view of a node is open.

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Unidades de trabajo |
| action.new | Nueva unidad |
| context.rename | Renombrar |
| context.move | Mover a… |
| context.delete | Eliminar |
| economic.budget | Presupuesto |
| economic.committed | Comprometido |
| economic.executed | Ejecutado |
| economic.measured | Medido |
| economic.available | Disponible |
| economic.allocated | Indirectos asignados |
| economic.total | Costo total |
| empty.title | Todavía no hay unidades de trabajo |
| empty.body | Crea la primera unidad dentro de la raíz del árbol. |
| error.title | No se pudieron calcular las unidades de trabajo |
| error.action | Reintentar |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The economic values are derived and read-only; no control edits them, and a recompute updates them in place.
- The tree is fully operable by keyboard, with a visible focus indicator on the node and its actions.
- Money keeps the application format; a negative available amount shows the minus sign plus its label, never the color alone.
- Expanding the economic view and editing the tree do not animate the values.

## Done when

- [ ] The tree shows exactly one root unit.
- [ ] The economic view sits on the node itself and shows all seven values.
- [ ] Create, rename, re-parent and delete work by pointer and by keyboard.
- [ ] Direct cost and total cost follow their formulas, and the values are never editable.
- [ ] Copy matches the table above character for character.
