import React from 'react';
import type { IvaMode } from '@ctrlmas/budget-engine';
import { useAppStore } from '@/state/appStore';
import { budgetTotals, IVA_RATE_LABEL } from '@/services/totals/budgetTotals';
import { formatAmount, currencyLabel } from '@/utils/formatting';
import { CONTRACT_SCALE } from '@ctrlmas/budget-engine';

/**
 * Totals under the money policy (engine computeTotals), in Spanish: direct
 * cost, each markup, IVA per rate (included or separate), total, the
 * contractual adjustment shown separately, and the contract total. The
 * IVA mode of the budget (`schedule.ivaMode`) is set here.
 */
export const BudgetTotalsPanel: React.FC = () => {
  const items = useAppStore((s) => s.items);
  const schedule = useAppStore((s) => s.schedule);
  const setIvaMode = useAppStore((s) => s.setIvaMode);
  const totals = budgetTotals(schedule, items);
  const mode: IvaMode = schedule.ivaMode ?? 'separado';
  const cur = currencyLabel(totals.currency);
  const label = (id: string) => items.find((i) => i.id === id)?.description || 'Recargo';
  const row = (text: string, value: string, cls = '', scale?: number) => (
    <div className={`summary-row ${cls}`} key={text}>
      <span>{text}</span>
      <span>{cur} {formatAmount(value, scale)}</span>
    </div>
  );

  return (
    <div className="summary-section budget-totals" aria-label="Totales del presupuesto">
      <h3 className="summary-section-title">Totales</h3>
      <div className="summary-row">
        <label htmlFor="ctrl-iva-mode">Precios</label>
        <select id="ctrl-iva-mode" value={mode} onChange={(e) => setIvaMode(e.target.value as IvaMode)}>
          <option value="separado">IVA separado (precios sin IVA)</option>
          <option value="incluido">IVA incluido en los precios</option>
        </select>
      </div>
      {row('Costo directo', totals.direct)}
      {totals.markups.filter((m) => m.amount !== '0').map((m) => row(label(m.id), m.amount))}
      {totals.iva.map((g) => (
        <div className="summary-row" key={`iva-${g.rate}`} data-iva-rate={g.rate}>
          <span>{IVA_RATE_LABEL[g.rate]}{mode === 'incluido' ? ' (incluido)' : ''} — base {cur} {formatAmount(g.base)}</span>
          <span>{cur} {formatAmount(g.tax)}</span>
        </div>
      ))}
      {row('Total', totals.total, 'summary-row-total')}
      {totals.adjustment !== '0' && row('Ajuste contractual', totals.adjustment)}
      {row('Total contrato', totals.contractTotal, 'summary-row-total summary-row-grand', Math.max(CONTRACT_SCALE[totals.currency], 0))}
    </div>
  );
};
