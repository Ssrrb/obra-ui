import { describe, it, expect } from 'vitest';
import { deserializeProject } from '@/services/file/fileService';

describe('staart migration on load', () => {
  it('injects staart_* items when missing, using cached percentages', () => {
    const json = JSON.stringify({
      version: '2.1.0',
      schedule: {
        name: 'Test',
        staartRows: [
          { label: 'Gastos generales (K):', percentage: 12 },
        ],
      },
      items: [
        { id: 'r1', parentId: null, rowType: 'regel', resourceType: 'arbeid', quantity: 1, total: 1000, sortOrder: 0, depth: 0, code: '', description: 'X', unit: 'st', materialPrice: null, laborPrice: null, unitPrice: 1000, isCollapsed: false, notes: '', ifcGuid: '', staartPercentage: null, nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: null, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
      ],
      spreadsheets: { sheets: [], activeSheetId: null },
    });
    const parsed = deserializeProject(json);
    const staart = parsed.items.filter((i: any) => i.rowType?.startsWith('staart_'));
    expect(staart.map((s: any) => [s.rowType, s.staartPercentage])).toEqual([['staart_ak', '12']]);
  });

  it('uses the K default when no staartRows cached', () => {
    const json = JSON.stringify({
      version: '2.1.0',
      schedule: { name: 'Empty' },
      items: [],
      spreadsheets: { sheets: [], activeSheetId: null },
    });
    const parsed = deserializeProject(json);
    const staart = parsed.items.filter((i: any) => i.rowType?.startsWith('staart_'));
    expect(staart.map((s: any) => [s.rowType, s.staartPercentage])).toEqual([['staart_ak', '10']]);
  });

  it('does NOT inject when staart_* items already exist', () => {
    const json = JSON.stringify({
      version: '2.1.0',
      schedule: { name: 'WithStaart' },
      items: [
        { id: 's1', parentId: null, rowType: 'staart_btw', staartPercentage: 9, total: 0, sortOrder: 0, depth: 0, code: '', description: 'BTW9', unit: '%', quantity: 9, materialPrice: null, laborPrice: null, unitPrice: 0, isCollapsed: false, notes: '', ifcGuid: '', nr: '', normQuantity: null, normFactor: null, normDivisor: null, normUnitPrice: null, resourceType: null, resourceLibraryId: null, verrekenbaar: null, tariefGroep: null },
      ],
      spreadsheets: { sheets: [], activeSheetId: null },
    });
    const parsed = deserializeProject(json);
    // An existing staart is kept as it is: no synthesis, no added Dutch VAT row.
    expect(parsed.items.map((i: any) => i.rowType)).toEqual(['staart_btw']);
  });
});
