import type { CostItem, GridColumn } from '@/types/costModel';
import { isFooterRow } from './gridRows';
import type { DecimalString } from '@ctrlmas/budget-engine';
import { Dec, dec, str } from '@/utils/decimal';

const orNull = (v: DecimalString | null | undefined): Dec | null => (v == null ? null : dec(v));
const nonZero = (v: Dec): Dec | null => (v.isZero() ? null : v);

/**
 * De numerieke waarde van één gridcel — de tegenhanger van wat GridCell
 * tékent, maar dan als getal. `null` betekent: die cel toont geen getal
 * (leeg, tekst, of niet van toepassing op dit rijtype) en telt dus niet mee.
 *
 * Bewust gespiegeld aan de weergaveregels in GridCell: de statusbalk moet
 * exact optellen wat je in de kolom ziet staan, niet een onderliggend veld
 * dat toevallig gevuld is.
 */
export function getGridCellNumber(
  item: CostItem,
  colKey: string,
  resourceTotals?: Record<string, DecimalString>
): Dec | null {
  const rt = item.rowType;
  const isRegel = rt === 'regel';
  const isBgr = rt === 'begrotingspost';
  const isBwk = rt === 'bewakingspost';

  switch (colKey) {
    case 'quantity':
      // Staartregels tonen een percentage — geen bedrag om op te tellen.
      if (rt.startsWith('staart_')) return null;
      return (isRegel || isBgr || isBwk) ? orNull(item.quantity) : null;

    case 'productienorm':
      return isRegel ? orNull(item.normQuantity) : null;

    case 'productiecapaciteit':
      return isRegel ? orNull(item.normFactor) : null;

    case 'hoeveelheid': {
      if (isRegel) {
        return regelHours(item);
      }
      if (isBgr || isBwk || rt === 'tekstregel') return orNull(item.quantity);
      return null;
    }

    case 'normUnitPrice': {
      if (isRegel) return orNull(item.normUnitPrice);
      if (isBgr || isBwk) {
        // Eigen prijs van een (bewakings)post: prijs/middel plus een
        // geïmporteerd materiaal-/loonbedrag (zie GridCell).
        return nonZero(postOwnPrice(item));
      }
      return null;
    }

    case 'unitPrice':
      return (isRegel || isBwk || isBgr) ? orNull(item.unitPrice) : null;

    case 'total':
      if (isRegel || rt === 'tekstregel' || rt === 'witregel') return null;
      return orNull(item.total);

    case 'kostenEd': {
      if (isRegel) {
        return nonZero(dec(item.normUnitPrice).plus(dec(item.laborPrice)));
      }
      if (isBgr || isBwk) return postCostPerUnit(item);
      return null;
    }

    case 'arbeidTotal':
    case 'materiaalTotal':
    case 'materieelTotal':
    case 'stelpostTotal':
    case 'onderaannemingTotal': {
      if (!resourceTotals) return null;
      const val = resourceTotals[colKey];
      return val ? nonZero(dec(val)) : null;
    }

    default:
      return null;
  }
}

/** Kolommen waarvoor de resource-uitsplitsing nodig is (duur om te berekenen). */
const RESOURCE_COLS = new Set([
  'arbeidTotal', 'materiaalTotal', 'materieelTotal', 'stelpostTotal', 'onderaannemingTotal',
]);

export function needsResourceTotals(columns: GridColumn[], minCol: number, maxCol: number): boolean {
  for (let c = minCol; c <= maxCol; c++) {
    const key = columns[c]?.key;
    if (key && RESOURCE_COLS.has(key)) return true;
  }
  return false;
}

export interface SelectionSummary {
  /** Aantal cellen met een getal (lege/tekstcellen tellen niet mee) */
  count: number;
  sum: DecimalString;
  min: DecimalString;
  max: DecimalString;
  /** Zijn de meegetelde cellen allemaal bedragen? Dan tonen we ze als valuta. */
  currency: boolean;
}

/** Kolommen die een bedrag tonen (voor de opmaak van de som) */
const CURRENCY_COLS = new Set([
  'normUnitPrice', 'unitPrice', 'total', 'kostenEd',
  'arbeidTotal', 'materiaalTotal', 'materieelTotal', 'stelpostTotal', 'onderaannemingTotal',
]);

/**
 * Tel de getallen in een celselectie op — de Excel-achtige som onderin.
 *
 * Synthetische hoofdstuk-footerrijen worden overgeslagen: dat zijn
 * automatische subtotalen, meetellen zou de som dubbel maken.
 */
export function summarizeCellSelection(
  rows: CostItem[],
  columns: GridColumn[],
  start: { row: number; col: number },
  end: { row: number; col: number },
  resourceTotalsMap?: Map<string, Record<string, DecimalString>>
): SelectionSummary {
  const minRow = Math.min(start.row, end.row);
  const maxRow = Math.max(start.row, end.row);
  const minCol = Math.min(start.col, end.col);
  const maxCol = Math.max(start.col, end.col);

  let count = 0;
  let sum = new Dec(0);
  let min: Dec | null = null;
  let max: Dec | null = null;
  let allCurrency = true;

  for (let r = minRow; r <= maxRow; r++) {
    const item = rows[r];
    if (!item || isFooterRow(item.id)) continue;
    for (let c = minCol; c <= maxCol; c++) {
      const col = columns[c];
      if (!col) continue;
      const val = getGridCellNumber(item, col.key, resourceTotalsMap?.get(item.id));
      if (val == null || !val.isFinite()) continue;
      count++;
      sum = sum.plus(val);
      if (min === null || val.lt(min)) min = val;
      if (max === null || val.gt(max)) max = val;
      if (!CURRENCY_COLS.has(col.key)) allCurrency = false;
    }
  }

  return {
    count,
    sum: str(sum),
    min: min ? str(min) : '0',
    max: max ? str(max) : '0',
    currency: count > 0 && allCurrency,
  };
}

/** Hours of a regel: quantity × norm / capacity (capacity null/0 → 1); null when quantity or norm is 0. */
export function regelHours(item: CostItem): Dec | null {
  const qty = dec(item.quantity);
  const norm = dec(item.normQuantity);
  if (qty.isZero() || norm.isZero()) return null;
  const cap = item.normFactor == null || dec(item.normFactor).isZero() ? new Dec(1) : dec(item.normFactor);
  return qty.times(norm).div(cap);
}

/** Own price of a (bewakings)post: price per resource plus imported material/labour price. */
export function postOwnPrice(item: CostItem): Dec {
  return dec(item.normUnitPrice).plus(dec(item.materialPrice)).plus(dec(item.laborPrice));
}

/** Cost per unit of a (bewakings)post: total / quantity, else its unit price. */
export function postCostPerUnit(item: CostItem): Dec | null {
  const qty = dec(item.quantity);
  if (qty.gt(0)) return dec(item.total).div(qty);
  return nonZero(dec(item.unitPrice));
}
