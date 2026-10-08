---
id: PV-11
frameName: "PV-11 · Socios"
page: "02 · Proyecto"
status: draft
rules: [L1-60, L1-61, L1-62, L1-63, L1-64]
---

# PV-11 · Socios

## What it is
The list and the editor of the socios of the project. A socio is a neutral record of a person or a company that the obra operates with. The record declares exactly one legal form, persona or empresa (L1-60), exactly one identifier (L1-61) and one name (L1-62). The project holds exactly one list of socios (L1-63). The record declares no role (L1-64): the document that names a socio gives its role.

## Must show
- One row per socio: name, legal form and identifier.
- The editor declares exactly one legal form from persona or empresa (L1-60), exactly one identifier (L1-61) and one name (L1-62).
- The editor offers no role field and the list shows no role column (L1-64).
- A purchase order names a socio as proveedor and a subcontract contract names it as subcontratista; those roles live in those documents, not in this record.
- The list belongs to the project and holds every socio once (L1-63).

## States
- **Vacío** — the project holds no socios; the state offers one next action: add the first socio.
- **Cargando** — the app reads the socio files of the project.
- **Error** — a socio file cannot be read; the message names the failure and offers retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Socios |
| button.new | Agregar socio |
| column.name | Nombre |
| column.legalForm | Forma legal |
| column.identifier | Identificador |
| field.name | Nombre |
| field.legalForm | Forma legal |
| field.identifier | Identificador |
| legalForm.persona | Persona |
| legalForm.empresa | Empresa |
| note | El rol del socio lo define el documento que lo nombra: proveedor en una orden de compra, subcontratista en un contrato. |
| dialog.new | Nuevo socio |
| dialog.edit | Editar socio |
| action.save | Guardar |
| action.cancel | Cancelar |
| empty.title | Todavía no hay socios |
| empty.body | La lista guarda los socios con los que opera el proyecto. |
| error.title | No se pudieron cargar los socios |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Every control is keyboard reachable with a visible focus ring; the editor traps focus and returns it to the row that opened it.
- Long names and identifiers wrap or truncate with a way to reach the full value.
- Motion stays restrained: no entry animation on the list; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows name, legal form and identifier for every socio.
- [ ] The editor declares one legal form from persona or empresa, one identifier and one name.
- [ ] No role field and no role column appear; the role stays in the document that names the socio.
- [ ] Copy matches the table above character for character.
