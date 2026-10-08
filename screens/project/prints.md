---
id: PV-12
frameName: "PV-12 · Impresos"
page: "04 · Impresos"
status: draft
rules: [L3-11, L3-18]
---

# PV-12 · Impresos

## What it is
The A4 outputs of the project: the printed budget (L3-11) and the printed advance certificate as one PDF (L3-18). They are paper documents, not pieces of the application: the print carries no activity bar, no status bar and no screen chrome.

## Must show
- The budget output shows every budget line with the amount, the committed amount and the available amount of the line.
- The certificate output is one A4 PDF: cover; the contract when the certificate names one; the measurement table with the previous quantity, the period quantity, the accumulated quantity, the unit price and the amounts; the totals with tax; then the evidence of each line (L3-18).
- The cover identifies the certificate: project, work unit, period and number.
- A line without evidence states so in its evidence section.
- Money shows two decimals and the currency of the project; the amounts never convert to another currency.
- The print starts from the budget and from the certificate; every page carries a page number.

## States
- **Cargando** — the app composes the output from the files of the project.
- **Error** — a source document cannot be read; the output does not start and the message offers retry.
- **Sin contrato** — the certificate names no contract; the output omits the contract section (L3-18).
- **Sin evidencia** — a measurement line holds no evidence; its evidence section states so.

## Copy (Spanish)
| Key | Text |
|---|---|
| print.budget.title | Presupuesto |
| print.budget.column.code | Código |
| print.budget.column.description | Descripción |
| print.budget.column.amount | Monto |
| print.budget.column.committed | Comprometido |
| print.budget.column.available | Disponible |
| print.certificate.title | Certificado |
| print.certificate.period | Período |
| print.certificate.workUnit | Unidad de trabajo |
| print.certificate.contract | Contrato |
| print.certificate.previous | Cantidad anterior |
| print.certificate.periodQuantity | Cantidad del período |
| print.certificate.accumulated | Cantidad acumulada |
| print.certificate.unitPrice | Precio unitario |
| print.certificate.amount | Monto |
| print.certificate.subtotal | Subtotal |
| print.certificate.tax | IVA {tasa}% |
| print.certificate.total | Total |
| print.certificate.evidence | Evidencia |
| print.certificate.noEvidence | Sin evidencia |
| print.footer.page | Página {n} de {m} |
| error.title | No se pudo generar el impreso |
| error.action | Reintentar |

## Notes for designers
- Use the inherited VS Code workbench layout and CSS described in `design/README.md`. Design domain content within its regions; follow the project design skills: better-interface, better-layout, better-typography, better-colors, better-accessibility, better-ui, better-writing, emil-design-eng.
- Both outputs are static paper pages: no interactive control, no entry animation and no motion.
- Money uses tabular numbers and two decimals; the totals stay legible on paper in both color modes.
- Each evidence section names the line and the file of the image it holds.

## Done when
- [ ] The budget output shows every line with amount, committed amount and available amount.
- [ ] The certificate PDF holds the cover, the contract when named, the measurement table, the totals with tax and the evidence of each line.
- [ ] A line without evidence is stated instead of left blank.
- [ ] The A4 pages carry no app chrome.
- [ ] Copy matches the table above character for character.
