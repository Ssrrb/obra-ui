---
id: CV-05
frameName: "CV-05 · Acceso"
page: "01 · Empresa"
status: draft
rules: [L3-01, L3-02, L2-07, L2-08]
---

# CV-05 · Acceso

## What it is
The local login of the application. The application asks for a login before it creates or opens a project, and the login needs no network service (L3-01). When the application holds no account, it asks for a name and a password and creates the first account (L3-02, L2-07). No login is required while no account exists (L2-08).

## Must show
- The name and the password fields; both keep a visible label.
- The action to sign in; on success the company view opens (CV-01).
- The variant Primera cuenta when the application holds no account (L2-08).
- The helper line that states that the data stays on this device and that no connection is needed (L3-01).
- The error of a wrong name or password, tied to both fields; focus returns to the name field.
- Enter submits from either field.

## States
- **Primera cuenta** — the application holds no account; it creates the first one from the name and the password (L3-02, L2-07).
- **Error** — the name or the password is incorrect; the screen shows the error.

## Copy (Spanish)
| Key | Text |
|---|---|
| app | Obra Studio |
| field.name | Nombre |
| field.password | Contraseña |
| button.login | Iniciar sesión |
| button.first | Crear cuenta |
| helper | Los datos quedan en este equipo. No hace falta conexión. |
| first.title | Primera cuenta |
| first.body | Crea la primera cuenta para empezar. |
| error.credentials | El nombre o la contraseña no son correctos. |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- After the first account exists, the application requires the login before it creates or opens a project (L3-01).

## Done when
- [ ] The three variants exist: Iniciar sesión, Primera cuenta, Error.
- [ ] Both fields keep visible labels in every variant.
- [ ] The first account needs no previous login (L2-08).
- [ ] The copy matches the table, character for character.
