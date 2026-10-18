import type { CostItem } from '@/types/costModel';
import type { DecimalString } from '@ctrlmas/budget-engine';
import { Dec, dec, str } from '@/utils/decimal';

/** Compute resource breakdown totals for each item (used in WpCalc view).
 *  In WpCalc, each regel has BOTH a loon component (norm × tarief) and a
 *  material/resource component. The resource columns split by type.
 *
 *  Gedeeld tussen het grid (kolomweergave) en de statusbalk (som van een
 *  celselectie) — één bron, zodat de opgetelde waarde niet kan afwijken
 *  van wat er in de cel staat. */
export function computeResourceTotals(items: CostItem[]): Map<string, Record<string, DecimalString>> {
  const map = new Map<string, Record<string, DecimalString>>();
  const childrenByParent = new Map<string, CostItem[]>();

  for (const item of items) {
    if (item.parentId) {
      const list = childrenByParent.get(item.parentId) ?? [];
      list.push(item);
      childrenByParent.set(item.parentId, list);
    }
  }

  const byId = new Map(items.map((i) => [i.id, i]));

  function getTotals(itemId: string): Record<string, DecimalString> {
    if (map.has(itemId)) return map.get(itemId)!;

    const item = byId.get(itemId);
    if (!item) return {};

    const zero = new Dec(0);
    const totals: Record<string, Dec> = {
      materiaalTotal: zero,
      arbeidTotal: zero,
      materieelTotal: zero,
      onderaannemingTotal: zero,
      stelpostTotal: zero,
    };

    if (item.rowType === 'regel') {
      const qty = dec(item.quantity);
      const lab = dec(item.laborPrice);
      const nup = dec(item.normUnitPrice);
      const norm = dec(item.normQuantity);
      const cap = item.normFactor == null ? new Dec(1) : dec(item.normFactor);

      // Dezelfde twee rekenmodellen als de calculator, anders tellen de
      // kostensoort-kolommen niet op tot het bedrag van de regel:
      //  - WpCalc (loon ingevuld, of geen norm): aantal × prijs
      //  - UI-1 (norm > 0, geen apart loon):     hoeveelheid × prijs/middel
      // Zonder dat tweede geval viel de productienorm weg: een regel van
      // 8 uur à 71,50 telde als 71,50 in plaats van 572,00.
      let loon: Dec;
      let matKosten: Dec;
      if (lab.gt(0) || norm.isZero()) {
        loon = lab.times(qty);
        matKosten = nup.times(qty);
      } else {
        loon = zero;
        matKosten = qty.times(norm).div(cap.isZero() ? 1 : cap).times(nup);
      }

      // For onderaannemer: entire amount goes to onderaanneming, no loon
      switch (item.resourceType) {
        case 'onderaannemer':
          totals.onderaannemingTotal = dec(item.total);
          break;
        case 'materieel':
          totals.arbeidTotal = loon;
          totals.materieelTotal = matKosten;
          break;
        case 'overig':
          totals.arbeidTotal = loon;
          totals.stelpostTotal = matKosten;
          break;
        default:
          totals.arbeidTotal = loon;
          totals.materiaalTotal = matKosten;
          break;
      }
    } else {
      const children = childrenByParent.get(itemId) ?? [];
      for (const child of children) {
        const childTotals = getTotals(child.id);
        for (const key of Object.keys(totals)) {
          totals[key] = totals[key].plus(dec(childTotals[key]));
        }
      }

      // Kale (bewakings)post met een eigen prijs: de calculator valt terug
      // op die eigen prijs zodra de kinderen niets opleveren (lege
      // bewakingspost, alleen een tekstregel). Doe hier hetzelfde, anders
      // staat dat geld wél in Totaal maar in geen enkele kostensoort-kolom
      // en loopt het hoofdstuk-subtotaal uit de pas met het totaal.
      const childSum = totals.arbeidTotal.plus(totals.materiaalTotal).plus(totals.materieelTotal)
        .plus(totals.stelpostTotal).plus(totals.onderaannemingTotal);
      if (childSum.isZero() && (item.rowType === 'begrotingspost' || item.rowType === 'bewakingspost')) {
        const qty = dec(item.quantity);
        const loon = dec(item.laborPrice).times(qty);
        // BasCalc pint de postprijs in materialPrice; normUnitPrice is de
        // handmatig ingevulde eigen prijs. Samen vormen ze het bedrag.
        const eigen = dec(item.normUnitPrice).plus(dec(item.materialPrice)).times(qty);
        switch (item.resourceType) {
          case 'onderaannemer':
            totals.onderaannemingTotal = dec(item.total);
            break;
          case 'materieel':
            totals.arbeidTotal = loon;
            totals.materieelTotal = eigen;
            break;
          case 'overig':
            totals.arbeidTotal = loon;
            totals.stelpostTotal = eigen;
            break;
          default:
            totals.arbeidTotal = loon;
            totals.materiaalTotal = eigen;
            break;
        }
      }
    }

    const out = Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, str(v)]));
    map.set(itemId, out);
    return out;
  }

  for (const item of items) {
    getTotals(item.id);
  }

  return map;
}
