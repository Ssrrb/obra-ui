---
id: PV-06
frameName: "PV-06 · Certificados"
page: "02 · Proyecto"
status: draft
rules: [L1-108, L1-112, L1-121, L1-123, L1-127, L3-16, L3-17, L3-18]
---

# PV-06 · Certificados

## What it is
The list and the editor of the advance certificates of the project. One certificate measures the work of exactly one period (L1-112) and only the ECMS issues it (L1-108). Every measurement line accepts evidence images in JPG, PNG or WebP (L1-121, L3-16, L3-17). A rejection returns the certificate to borrador (L1-123), the total includes the tax of the project (L1-127) and the print is one A4 PDF (L3-18).

## Must show
- One row per certificate: number, period, work unit, contract when it names one, state and total; selecting the row opens the certificate. The editor declares exactly one period with a start and an end; an end that is not later than the start is refused with a message (L1-112).
- The certificate names exactly one work unit and at most one contract; only contracts in the state vigente are offered.
- With a contract, every measurement line names a budget line that the contract covers; each line names exactly one budget line and declares the quantity of the period.
- The unit price equals the price of the budget line and is read-only; the amount equals the quantity of the period multiplied by the unit price. The previous quantity and the accumulated quantity are shown and derived; the user never types them.
- Each line holds zero or more evidence files: JPG, PNG or WebP only (L1-121, L3-16); the screen refuses every other format and states the accepted formats (L3-17).
- The totals show the sum of the lines, the tax rate of the project and the total (L1-127). Actions by state: borrador edits and emits; emitido approves or rejects; a rejection returns the certificate to borrador and records the account and the moment (L1-123); aprobado is read-only and offers registrar pago and imprimir.
- The screen refuses an approval that would pass the contract amount; the message says the contract needs an increase.
- Imprimir produces one A4 PDF: cover; the contract when named; the measurement table with previous, period, accumulated, unit price and amounts; totals with tax; then the evidence of each line (L3-18). A line without evidence states so.

## States
- **Vacío** — the project holds no certificates; the state offers one next action: create the first certificate.
- **Cargando** — the app reads the certificate files of the project.
- **Error** — a certificate file cannot be read; the message names the failure and offers retry.
- **Borrador** — the user edits the period and the measurement lines.
- **Emitido** — the certificate waits for approval; a rejection returns it to borrador.
- **Aprobado** — the certificate is frozen; it prints and accepts payments.

## Copy (Spanish)
| Key | Text |
|---|---|
| title | Certificados |
| button.new | Nuevo certificado |
| column.period | Período |
| column.workUnit | Unidad de trabajo |
| column.state | Estado |
| column.total | Total |
| state.draft | Borrador |
| state.issued | Emitido |
| state.approved | Aprobado |
| action.issue | Emitir |
| action.approve | Aprobar |
| action.reject | Rechazar |
| action.print | Imprimir |
| action.registerPayment | Registrar pago |
| field.contract | Contrato |
| field.quantity | Cantidad del período |
| evidence.add | Adjuntar evidencia |
| evidence.formats | Solo JPG, PNG o WebP. |
| total.tax | IVA {tasa}% |
| error.period | El fin del período debe ser posterior al inicio. |
| empty.title | Todavía no hay certificados |
| error.title | No se pudieron cargar los certificados |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- The state never travels by color alone; every control is keyboard reachable with a visible focus ring, and the evidence viewer closes with Escape. Money uses two decimals and the currency of the project; derived quantities and amounts are read-only.
- Motion stays restrained: no entry animation on the list or the lines; keyboard-initiated interactions do not animate.

## Done when
- [ ] The list shows one row per certificate with period, work unit, state and total.
- [ ] The editor shows the period, the work unit, the optional contract and at least one measurement line.
- [ ] Evidence accepts JPG, PNG and WebP only; every other format is refused with a message.
- [ ] The states show the actions above; a rejection returns to borrador and an approval over the contract amount is refused.
- [ ] The A4 print holds the cover, the contract, the measurement table, the totals with tax and the evidence.
- [ ] Copy matches the table above character for character.
