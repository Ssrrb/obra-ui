import { describe, it, expect } from 'vitest';
import type { CostItem } from '@/types/costModel';
import { recalculateItems, getStaartBreakdown, computeBtwLaagDirect } from '@/services/calculation/calculator';
import { makeStaartItem, ensureBtwLaagItem, synthesizeStaartItems } from '@/services/calculation/staartDefaults';

function mkRegel(total: string): CostItem {
  return {
    id: `r-${Math.random()}`, parentId: null, sortOrder: 0, code: '',
    description: 'Regel', unit: 'st', quantity: '1', materialPrice: null,
    laborPrice: null, unitPrice: total, total, isCollapsed: false, depth: 0,
    notes: '', ifcGuid: '', rowType: 'regel', staartPercentage: null, nr: '',
    normQuantity: '1', normFactor: '1', normDivisor: '1', normUnitPrice: total,
    resourceType: 'materiaal', resourceLibraryId: null, verrekenbaar: null,
    tariefGroep: null,
  };
}

describe('btw laag tarief', () => {
  it('rekent laag tarief over de grondslag en hoog over de rest', () => {
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    laag.staartBtwBasis = '1000';
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([mkRegel('10000'), laag, hoog]);

    const laagOut = items.find(i => i.rowType === 'staart_btw_laag')!;
    const hoogOut = items.find(i => i.rowType === 'staart_btw')!;
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    // excl-eind = 10000; laag: 9% over 1000 = 90; hoog: 21% over 9000 = 1890
    expect(laagOut.total).toBe('0'); // 90 → 0
    expect(laagOut.staartItemBreakdown?.bedrag).toBe('0'); // 1000 → 0
    expect(hoogOut.total).toBe('0'); // 1890 → 0
    expect(hoogOut.staartItemBreakdown?.bedrag).toBe('0'); // 9000 → 0
    expect(hoogOut.staartItemBreakdown?.totaal).toBe('10000'); // 11980 → 10000 (excl-eind)
  });

  it('zonder grondslag draagt de laag-regel niets bij (hoog over alles)', () => {
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([mkRegel('10000'), laag, hoog]);
    expect(items.find(i => i.rowType === 'staart_btw_laag')!.total).toBe('0');
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    expect(items.find(i => i.rowType === 'staart_btw')!.total).toBe('0'); // 2100 → 0
  });

  it('clampt een grondslag groter dan het excl-eindbedrag', () => {
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    laag.staartBtwBasis = '99999';
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([mkRegel('10000'), laag, hoog]);
    // Grondslag laag = excl-eind (10000), hoog-grondslag = 0
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    expect(items.find(i => i.rowType === 'staart_btw_laag')!.total).toBe('0'); // 900 → 0
    expect(items.find(i => i.rowType === 'staart_btw')!.total).toBe('0');
  });

  it('getStaartBreakdown telt beide tarieven mee in de aanneemsom', () => {
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    laag.staartBtwBasis = '1000';
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([mkRegel('10000'), laag, hoog]);
    const bd = getStaartBreakdown(items);
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    expect(bd.btwLaagAmount).toBe('0'); // 90 → 0
    expect(bd.btwLaagGrondslag).toBe('0'); // 1000 → 0
    expect(bd.btwAmount).toBe('0'); // 1890 → 0
    expect(bd.btwGrondslag).toBe('0'); // 9000 → 0
    expect(bd.aanneemsomAfgerond).toBe('10000'); // 11980 → 10000
  });

  it('synthesizeStaartItems: only the K row, no Dutch VAT rows', () => {
    expect(synthesizeStaartItems({}).map(i => i.rowType)).toEqual(['staart_ak']);
  });

  it('per-onderdeel markering: laag hoofdstuk telt pro rata mee', () => {
    // Twee hoofdstukken met elk één regel: 4000 (laag) en 6000 (hoog).
    const chLaag: CostItem = { ...mkRegel('0'), id: 'ch-laag', rowType: 'chapter', description: 'Renovatie', btwTarief: 'laag' };
    const rLaag = { ...mkRegel('4000'), parentId: 'ch-laag', depth: 1 };
    const chHoog: CostItem = { ...mkRegel('0'), id: 'ch-hoog', rowType: 'chapter', description: 'Nieuwbouw' };
    const rHoog = { ...mkRegel('6000'), parentId: 'ch-hoog', depth: 1 };
    const winst = makeStaartItem('staart_winst', 'Winst:', '10', 99);
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([chLaag, rLaag, chHoog, rHoog, winst, laag, hoog]);

    // excl-eind = 10000 + 10% winst = 11000; laag-fractie = 4000/10000 = 0.4
    // → laag-grondslag 4400 (opslag telt pro rata mee), hoog-grondslag 6600.
    const laagOut = items.find(i => i.rowType === 'staart_btw_laag')!;
    const hoogOut = items.find(i => i.rowType === 'staart_btw')!;
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    expect(laagOut.staartItemBreakdown?.bedrag).toBe('0'); // 4400 → 0
    expect(laagOut.total).toBe('0');        // 9% van 4400: 396 → 0
    expect(hoogOut.staartItemBreakdown?.bedrag).toBe('0'); // 6600 → 0
    expect(hoogOut.total).toBe('0');       // 21% van 6600: 1386 → 0
  });

  it('hoog-override binnen een laag hoofdstuk trekt correct af', () => {
    const ch: CostItem = { ...mkRegel('0'), id: 'ch', rowType: 'chapter', description: 'Renovatie', btwTarief: 'laag' };
    const rA = { ...mkRegel('3000'), parentId: 'ch', depth: 1 };
    const rB: CostItem = { ...mkRegel('2000'), parentId: 'ch', depth: 1, btwTarief: 'hoog' };
    expect(computeBtwLaagDirect([ch, rA, rB])).toBe('3000');
  });

  it('markering gaat vóór de handmatig ingevulde grondslag', () => {
    const ch: CostItem = { ...mkRegel('0'), id: 'ch', rowType: 'chapter', description: 'X', btwTarief: 'laag' };
    const r = { ...mkRegel('1000'), parentId: 'ch', depth: 1 };
    const laag = makeStaartItem('staart_btw_laag', 'Btw laag:', '9', 100);
    laag.staartBtwBasis = '123'; // wordt genegeerd zodra markering actief is
    const hoog = makeStaartItem('staart_btw', 'Btw hoog:', '21', 101);
    const items = recalculateItems([ch, r, laag, hoog]);
    // Alles laag: grondslag = volledige excl-eind (1000), hoog = 0
    // ctrl schema 2: upstream Dutch VAT rows contribute zero (IVA comes from
    // ivaRate/ivaMode, see computeTotals). Upstream expectations kept as before → after.
    expect(items.find(i => i.rowType === 'staart_btw_laag')!.staartItemBreakdown?.bedrag).toBe('0'); // 1000 → 0
    expect(items.find(i => i.rowType === 'staart_btw')!.total).toBe('0');
  });

  it('ensureBtwLaagItem voegt de regel toe aan een oude staart (vóór de hoog-regel)', () => {
    const oud = [
      mkRegel('5000'),
      makeStaartItem('staart_winst', 'Winst:', '5', 9005),
      makeStaartItem('staart_btw', 'Btw hoog:', '21', 9007),
      makeStaartItem('staart_afronding', 'Afronding', null, 9008),
    ];
    const items = ensureBtwLaagItem(oud);
    const idxLaag = items.findIndex(i => i.rowType === 'staart_btw_laag');
    const idxHoog = items.findIndex(i => i.rowType === 'staart_btw');
    expect(idxLaag).toBeGreaterThan(-1);
    expect(idxLaag).toBeLessThan(idxHoog);
    // Idempotent
    expect(ensureBtwLaagItem(items)).toBe(items);
    // Zonder staart: niets toevoegen
    expect(ensureBtwLaagItem([mkRegel('1')]).length).toBe(1);
  });
});
