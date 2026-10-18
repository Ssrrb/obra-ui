import { describe, it, expect, beforeEach } from 'vitest';
import { useAppStore } from '@/state/appStore';
import { getColumnsForView } from '@/components/grid/gridConstants';
import { parseNumericInput } from '@/utils/numericInput';
import { formatCurrency } from '@/utils/formatting';

const s = () => useAppStore.getState();

// Schema 2 money policy: what the user types is stored exactly (no silent
// rounding to cents, as upstream did on input); prices are DISPLAYED with two
// decimals and the line amount is quantized to two decimals by the engine.
// Upstream expectations (input rounded to cents) are listed in the report.

beforeEach(() => {
  s().resetSchedule();
  s().setItems([]);
});

describe('bedragen: exact opgeslagen, twee decimalen getoond', () => {
  it('de Prijs-kolom is een bedrag', () => {
    const col = getColumnsForView('wpcalc', false).find(c => c.key === 'normUnitPrice')!;
    expect(col.type).toBe('currency');
  });

  it('bewaart getypte invoer exact en toont twee decimalen', () => {
    expect(parseNumericInput('15,319024')).toBe('15.319024');      // upstream: 15.32
    expect(parseNumericInput('12,345')).toBe('12.345');            // upstream: 12.35
    expect(formatCurrency(parseNumericInput('12,345'))).toBe('12,35');
    expect(formatCurrency(parseNumericInput('99,999'))).toBe('100,00');
  });

  it('een formule levert hoogstens 12 decimalen (engine, HALF_UP)', () => {
    expect(parseNumericInput('=10/3')).toBe('3.333333333333');     // upstream: 3.33
    expect(parseNumericInput('=12,2*2,22')).toBe('27.084');        // upstream: 27.08
  });

  it('laat een bedrag met twee of minder decimalen ongemoeid', () => {
    expect(parseNumericInput('550')).toBe('550');
    expect(parseNumericInput('71,5')).toBe('71.5');
    expect(parseNumericInput('1.240,84')).toBe('1240.84');
  });

  it('aantallen en normen houden hun precisie', () => {
    expect(parseNumericInput('0,125')).toBe('0.125');
    expect(parseNumericInput('36,455')).toBe('36.455');
  });

  it('het regelbedrag wordt op centen gekwantiseerd', () => {
    const ch = s().addChapter(null);
    const post = s().addItem(ch);
    s().updateItem(post, 'quantity', '81');
    s().updateItem(post, 'normUnitPrice', parseNumericInput('15,319024'));
    // 81 × 15,319024 = 1240,841944 → 1240,84 (upstream: 81 × 15,32 = 1240,92)
    expect(s().items.find(i => i.id === post)!.total).toBe('1240.84');
  });
});
