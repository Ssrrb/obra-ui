/**
 * Totals block of the money policy for printed reports (ctrl build): the
 * same engine computeTotals the editor shows — IVA per rate, total, the
 * contractual adjustment separately, and the contract total.
 */
import type { CostItem, CostSchedule } from '@/types/costModel';
import { CONTRACT_SCALE } from '@ctrlmas/budget-engine';
import { budgetTotals, IVA_RATE_LABEL } from '@/services/totals/budgetTotals';
import { currencyLabel, type DecimalLike } from '@/utils/formatting';

export function ivaTotalsRows(
  schedule: CostSchedule,
  items: CostItem[],
  fmt: (value: DecimalLike, scale?: number) => string,
  row: (label: string, amount: string, cls: string) => string,
): string {
  const totals = budgetTotals(schedule, items);
  const cur = currencyLabel(totals.currency);
  const incluido = (schedule.ivaMode ?? 'separado') === 'incluido';
  let html = row('Costo directo', `${cur} ${fmt(totals.direct)}`, 'subtotal-row');
  for (const m of totals.markups) {
    if (m.amount === '0') continue;
    const label = items.find((i) => i.id === m.id)?.description || 'Recargo';
    html += row(label, `${cur} ${fmt(m.amount)}`, 'staart-row');
  }
  for (const g of totals.iva) {
    html += row(`${IVA_RATE_LABEL[g.rate]}${incluido ? ' (incluido)' : ''} sobre ${cur} ${fmt(g.base)}`, `${cur} ${fmt(g.tax)}`, 'staart-row');
  }
  html += row('Total', `${cur} ${fmt(totals.total)}`, 'subtotal-row');
  if (totals.adjustment !== '0') html += row('Ajuste contractual', `${cur} ${fmt(totals.adjustment)}`, 'staart-row');
  html += row('Total contrato', `${cur} ${fmt(totals.contractTotal, Math.max(CONTRACT_SCALE[totals.currency], 0))}`, 'total-row');
  return html;
}
