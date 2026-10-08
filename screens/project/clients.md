---
id: PV-09
frameName: "PV-09 · Clientes"
page: "02 · Proyecto"
status: draft
rules: [L1-150, L1-151, L1-152, L1-153]
---

# PV-09 · Clientes

## What it is
The list and the editor of the clients of the project. A client is a person or a company that pays the work of the project. Each client declares exactly one legal form, persona or empresa (L1-150), exactly one identifier (L1-151) and one name (L1-152). The project holds exactly one list of clients (L1-153), and a collection names one client of that list.

## Must show
- One row per client: name, legal form and identifier.
- The editor declares exactly one legal form from persona or empresa (L1-150), exactly one identifier (L1-151) and one name (L1-152).
- The list belongs to the project and holds every client once (L1-153).
- The screen creates and edits a client; the list is the only source of the client that a collection names.
- When the list is empty, the state offers one next action: add the first client.

## States
- **Vacío** — the project holds no clients; the state offers one next action: add the first client.
- **Cargando** — the app reads the client files of the project.
- **Error** — a client file cannot be read; the message names the failure and offers retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Clientes |
| button.new | Agregar cliente |
| column.name | Nombre |
| column.legalForm | Forma legal |
| column.identifier | Identificador |
| field.name | Nombre |
| field.legalForm | Forma legal |
| field.identifier | Identificador |
| legalForm.persona | Persona |
| legalForm.empresa | Empresa |
| dialog.new | Nuevo cliente |
| dialog.edit | Editar cliente |
| action.save | Guardar |
| action.cancel | Cancelar |
| empty.title | Todavía no hay clientes |
| empty.body | Un cobro nombra a un cliente de esta lista. |
| error.title | No se pudieron cargar los clientes |
| error.action | Reintentar |
| error.name | Escribe el nombre del cliente. |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Every control is keyboard reachable with a visible focus ring; the editor traps focus and returns it to the row that opened it.
- Long names and identifiers wrap or truncate with a way to reach the full value.
- Motion stays restrained: no entry animation on the list; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows name, legal form and identifier for every client.
- [ ] The editor declares one legal form from persona or empresa, one identifier and one name.
- [ ] The project holds one list of clients and a collection takes its client from that list.
- [ ] Copy matches the table above character for character.
