---
id: CV-01
frameName: "CV-01 · Proyectos"
page: "01 · Empresa"
status: draft
rules: [L3-29, L3-30, L3-35, L1-172, L2-43]
---

# CV-01 · Proyectos

## What it is
The first screen of the company view. It lists the projects of the construction company and separates the active projects from the finished projects (L3-29). It opens a project (L3-30) and marks a project finished or active (L3-35, L1-172). The list comes from the index file of the company (L2-43).

## Must show
- Every project of the construction company, separated into active and finished (L3-29).
- The name, the state, the currency and the last activity of each project.
- The action to open a project; opening shows the project view (L3-30).
- The action to mark a project finished and the action to mark it active again (L3-35, L1-172).
- A search that filters the visible group by project name.
- The currency of each project by name; the list never shows a money amount.
- Marking a project finished moves it to the finished group and offers to undo the change.
- The state changes only from the state control of the row or from its menu.

## States
- **Vacío** — the company holds no projects.
- **Sin terminados** — the finished group holds no project.
- **Sin resultados** — the search matches no project.
- **Cargando** — the application reads the index file.
- **Error** — the index file is unreadable; the screen offers a retry.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Proyectos |
| subtitle | {n} en curso · {m} terminados |
| tab.active | En curso |
| tab.finished | Terminados |
| search.placeholder | Buscar proyectos |
| button.new | Crear proyecto |
| column.project | Proyecto |
| column.state | Estado |
| column.currency | Moneda |
| column.activity | Última actividad |
| state.active | Activo |
| state.finished | Terminado |
| menu.open | Abrir |
| menu.finish | Marcar como terminado |
| menu.reactivate | Marcar como activo |
| empty.title | Todavía no hay proyectos |
| empty.body | Un proyecto agrupa el presupuesto, los certificados y los pagos de una obra. |
| empty.finished.title | No hay proyectos terminados |
| empty.finished.body | Los proyectos que marques como terminados van a aparecer acá. |
| empty.search | Sin resultados para «{consulta}» |
| empty.search.action | Limpiar búsqueda |
| error.title | No se pudieron cargar los proyectos |
| error.action | Reintentar |
| toast.finished | Proyecto marcado como terminado |
| toast.reactivated | Proyecto marcado como activo |
| toast.undo | Deshacer |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Rule L1-172 holds exactly two states of a project: Activo and Terminado. Do not add another state.

## Done when
- [ ] The two groups and the five states exist.
- [ ] Selecting a project opens the project view (L3-30).
- [ ] Marking a project finished and undoing the mark both work.
- [ ] The copy matches the table, character for character.
