import { describe, it, expect, beforeEach } from 'vitest';
// Schema 2: Dutch VAT rows (staart_btw) contribute zero in the engine; the
// per-document staart check uses a percentage markup row (staart_winst) instead.
import { useAppStore } from '@/state/appStore';

describe('Multi-document staart calculation', () => {
  beforeEach(() => {
    // Reset store to clean state
    useAppStore.setState({ documents: [], activeDocumentId: '', items: [] } as any);
  });

  it('switching tabs recomputes staart per document', () => {
    const store = useAppStore.getState() as any;
    store.addDocument({ id: 'a', filePath: null, fileName: 'A', isModified: false });
    store.setItems([
      { id: 'r1', parentId: null, rowType: 'regel', resourceType: 'arbeid', quantity: 1, unitPrice: 100000, total: 100000, sortOrder: 0, depth: 0, code: '', description: '', unit: 'st', materialPrice: null, laborPrice: null, isCollapsed: false, notes: '', ifcGuid: '', staartPercentage: null, nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: 100000, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
      { id: 's1', parentId: null, rowType: 'staart_winst', staartPercentage: 21, total: 0, sortOrder: 100, depth: 0, code: '', description: 'Winst', unit: '%', quantity: 21, materialPrice: null, laborPrice: null, unitPrice: 0, isCollapsed: false, notes: '', ifcGuid: '', nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: null, resourceType: null, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
    ]);
    store.recalculate();
    const aBtw: any = useAppStore.getState().items.find((i: any) => i.id === 's1');
    expect(Number(aBtw?.staartItemBreakdown?.subtotaal)).toBeCloseTo(21000, 2);

    store.addDocument({ id: 'b', filePath: null, fileName: 'B', isModified: false });
    store.setItems([
      { id: 'r2', parentId: null, rowType: 'regel', resourceType: 'arbeid', quantity: 1, unitPrice: 50000, total: 50000, sortOrder: 0, depth: 0, code: '', description: '', unit: 'st', materialPrice: null, laborPrice: null, isCollapsed: false, notes: '', ifcGuid: '', staartPercentage: null, nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: 50000, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
      { id: 's2', parentId: null, rowType: 'staart_winst', staartPercentage: 21, total: 0, sortOrder: 100, depth: 0, code: '', description: 'Winst', unit: '%', quantity: 21, materialPrice: null, laborPrice: null, unitPrice: 0, isCollapsed: false, notes: '', ifcGuid: '', nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: null, resourceType: null, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
    ]);
    store.recalculate();
    const bBtw: any = useAppStore.getState().items.find((i: any) => i.id === 's2');
    expect(bBtw?.staartItemBreakdown?.subtotaal).toBeCloseTo(10500, 2);

    store.setActiveDocument('a');
    const aAgain: any = useAppStore.getState().items.find((i: any) => i.id === 's1');
    expect(aAgain?.staartItemBreakdown?.subtotaal).toBeCloseTo(21000, 2);
  });
});
