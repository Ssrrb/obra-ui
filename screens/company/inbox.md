---
id: CV-02
frameName: "CV-02 · Bandeja"
page: "01 · Empresa"
status: draft
rules: [L3-31, L3-13, L3-14, L3-15, L2-33, L2-36, L2-37]
---

# CV-02 · Bandeja

## What it is
The inbox of the account. It shows one item for every event of every project of the construction company (L3-31, L3-13). An event holds one identifier, one reference to a document, one action, the account that caused it and one moment (L2-33). The title, the number and the amount of the item resolve from the document (L2-36). Selecting an item opens its document (L3-14). The read state belongs to the account (L3-15, L2-37).

## Must show
- One item for every event of every project of the construction company (L3-31, L3-13).
- Only the events of the account that reads them (L3-31); the read state belongs to that account (L3-15, L2-37).
- Each item shows the type and the number of the document, the action, the project and the moment (L2-33, L2-36).
- The actions to mark an item read and unread.
- The items grouped by day: today, yesterday, then the date.
- An unread item and a read item look different; the dot is not the only cue.
- Selecting an item opens its document; when its project is not open, the application opens the project first (L3-14).
- Opening marks the item read for the current account only; the other accounts keep it unread (L3-15).

## States
- **Vacío** — no events exist.
- **Cargando** — the application reads the project folders.
- **Error** — a project folder is unreadable; the rest of the inbox stays up to date; the screen offers a retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Bandeja |
| subtitle | Novedades de todos los proyectos |
| group.today | Hoy |
| group.yesterday | Ayer |
| action.created | Creado |
| action.issued | Emitido |
| action.approved | Aprobado |
| action.rejected | Rechazado |
| action.registered | Registrado |
| action.cancelled | Anulado |
| action.received | Recibido |
| menu.markRead | Marcar como leída |
| menu.markUnread | Marcar como no leída |
| empty.title | Sin novedades |
| empty.body | Cuando un documento se cree o cambie de estado, va a aparecer acá. |
| error.title | Un proyecto no se pudo leer |
| error.body | El resto de la bandeja está al día. |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Opening an item marks it read for the current account only (L3-15).
- Filters by type and by read state are outside the MVP; do not draw them.

## Done when
- [ ] Read and unread items are both drawn; the dot is not the only cue.
- [ ] The item shows the type, the number, the action, the project and the moment.
- [ ] Selecting an item opens its document.
- [ ] The copy matches the table, character for character.
