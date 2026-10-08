---
id: CV-04
frameName: "CV-04 · Cuentas"
page: "01 · Empresa"
status: draft
rules: [L2-01, L2-02, L2-03, L2-04, L2-05, L2-07, L3-03, L3-34]
---

# CV-04 · Cuentas

## What it is
The accounts of the construction company and their capabilities (L3-34, L2-02, L2-03). Every account holds its own local login (L2-01). The application creates the first account when it holds none (L2-07); any account can create another account (L3-03). Every account receives every capability by default (L2-04). Removing the capability of an engine hides that engine from the account (L2-05).

## Must show
- The name, the capabilities and the creation date of each account (L3-34).
- The two capabilities of the application, ECMS and ERP, as separate values per account (L2-02).
- Every capability on by default; the new-account dialog starts with both on (L2-04).
- The action to create an account (L3-03, L2-07).
- The action to edit the capabilities of an account (L2-03).
- The dialog Nueva cuenta: name, password, the two capabilities with the chip Recomendado, and the note that the password stays on this device.
- The dialog Editar capacidades: the current capabilities and a warning when both are off (L2-05).
- The note that every account has its own inbox.

## States
- **Error** — the accounts are unreadable; the screen offers a retry.
- **Sin capacidades** — both capabilities are off; the dialog warns that the account sees no interface (L2-05).

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Cuentas |
| subtitle | Acceso a este equipo |
| button.new | Crear cuenta |
| column.account | Cuenta |
| column.capabilities | Capacidades |
| column.created | Creada |
| capability.ecms | ECMS |
| capability.erp | ERP |
| note | Cada cuenta tiene su propia bandeja. |
| dialog.new.title | Nueva cuenta |
| dialog.new.name | Nombre |
| dialog.new.password | Contraseña |
| dialog.new.passwordHelp | Se guarda en este equipo. |
| dialog.new.capabilities | Capacidades |
| dialog.new.capabilitiesHelp | ECMS — Obras y mediciones · ERP — Compras y pagos |
| dialog.new.recommended | Recomendado |
| dialog.new.submit | Crear cuenta |
| dialog.edit.title | Editar capacidades |
| dialog.edit.warning | Sin capacidades, la cuenta no va a ver ninguna interfaz. |
| dialog.edit.submit | Guardar cambios |
| dialog.cancel | Cancelar |
| error.title | No se pudieron cargar las cuentas |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Open question: rule L2-03 assigns each capability to an account. Confirm with the author that a user may change a capability after creation. Draw the Editar capacidades dialog only when the author confirms.

## Done when
- [ ] The table and the two dialogs are drawn with the two capabilities.
- [ ] Both capabilities start on for a new account.
- [ ] The warning for zero capabilities exists.
- [ ] The copy matches the table, character for character.
