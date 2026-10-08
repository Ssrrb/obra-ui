---
id: PV-00
frameName: "PV-00 · Explorador del proyecto"
page: "02 · Proyecto"
status: draft
rules: [L2-13, L2-14, L3-06, L3-27]
---

# PV-00 · Explorador del proyecto

## What it is

The explorer of the open project. It shows the single folder of the project in the window (L2-13, L2-14, L3-06), and the tree of that folder is the way to every document of the project. The folder holds every record, so a copy of the folder holds the whole project (L3-27).

## Must show

- The folder of the open project, and no other project (L2-13, L3-06).
- The tree nodes: Presupuesto, Unidades de trabajo, Partidas, Órdenes de compra, Contratos, Certificados, Pagos, Cobros, Insumos, Clientes, Socios, Adjuntos.
- Partidas only when the purchasing flow policy of the project requires a partida.
- The New menu with the item kinds the selected node accepts.
- The node menu with Abrir, Renombrar and Eliminar; Eliminar appears only when the state of the document allows the deletion.
- A node opens its document in the editor area; with no document open, the editor area shows its neutral state.
- Only records that live inside the folder of the project (L2-13, L3-27).

## States

- **Sin documento abierto** — the editor area shows the neutral state until a node opens a document.
- **Cargando** — the application reads the folder of the project.
- **Error** — the folder is unreadable; the copy names the folder, offers a retry, and the project stays on disk (L3-27).
- **Menú Nuevo** — the item menu is open on a node.
- **Menú contextual** — the node menu is open; Eliminar is absent when the state forbids the deletion.

## Copy (Spanish)

| Key | Text |
|---|---|
| title | Explorador |
| node.budget | Presupuesto |
| node.workUnits | Unidades de trabajo |
| node.requests | Partidas |
| node.orders | Órdenes de compra |
| node.contracts | Contratos |
| node.certificates | Certificados |
| node.payments | Pagos |
| node.collections | Cobros |
| node.inputs | Insumos |
| node.clients | Clientes |
| node.partners | Socios |
| node.attachments | Adjuntos |
| action.new | Nuevo |
| context.open | Abrir |
| context.rename | Renombrar |
| context.delete | Eliminar |
| editor.neutral | Abre un documento del árbol para empezar. |
| error.folder | No se pudo leer la carpeta del proyecto. |
| error.action | Reintentar |

## Notes for designers

- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The tree and both menus are fully operable by keyboard, with a visible focus indicator; the context menu opens from the keyboard.
- A long name wraps or truncates and keeps a way to reach the full value.
- Opening a document, switching nodes and every state change update in place; no entry animation on the tree.

## Done when

- [ ] The twelve nodes are shown, and Partidas appears only when the project policy requires it.
- [ ] The editor area shows its neutral state when no document is open, and Eliminar appears only when the state allows it.
- [ ] Copy matches the table above character for character.
