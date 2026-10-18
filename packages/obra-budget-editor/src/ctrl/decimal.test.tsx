/**
 * Schema 2 money paths in the editor: input parsing, display, a grid edit,
 * the totals panel (IVA per rate, adjustment), importers that keep the
 * source literal, native files and the .ocs export.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/state/appStore';
import { parseDecimalInput, parseNumericInput, INPUT_MESSAGES } from '@/utils/numericInput';
import { formatAmount, formatCurrency, formatNumber, formatNumberForEdit } from '@/utils/formatting';
import { useGridEditing } from '@/components/grid/useGridEditing';
import { getColumnsForView } from '@/components/grid/gridConstants';
import { BudgetTotalsPanel } from '@/components/report/BudgetTotalsPanel';
import { parseCsv, parseXlsxTabular, buildFromMapping, autoDetectMapping } from '@/services/importers/genericTabularImporter';
import { importBc3 } from '@/services/importers/bc3Importer';
import { deserializeProject, serializeProject, serializeProjectForFile } from '@/services/file/fileService';
import { createDefaultSchedule } from '@/data/defaultBudget';
import { recalculateItems } from '@/services/calculation/calculator';
import type { CostItem } from '@/types/costModel';

const s = () => useAppStore.getState();
const LITERAL = '123456789012345678.123456';

beforeEach(() => {
	useAppStore.setState(useAppStore.getInitialState(), true);
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('number input → canonical decimal (es-PY, engine parseDecimalInput)', () => {
	const ok: [string, string | null][] = [
		['', null], ['   ', null],
		['6,66', '6.66'], ['1.234,56', '1234.56'], ['-15,5', '-15.5'], ['0,10', '0.1'],
		['1.500', '1500'], ['1.234.567', '1234567'],          // es-PY thousands (guaraníes)
		['1234.56', '1234.56'], ['60.5', '60.5'],               // plain, as upstream accepted
		['=12,2*2,22', '27.084'], ['17,7+5', '22.7'], ['2*(3+4,5)', '15'], ['=-5+3', '-2'],
		['=10/3', '3.333333333333'],                             // engine: HALF_UP to 12 decimals
		['999999999999999999999999', '999999999999999999999999'],
		['0,000000000001', '0.000000000001'],
	];
	it.each(ok)('%j → %j', (input, value) => {
		expect(parseDecimalInput(input)).toEqual({ ok: true, value });
		expect(parseNumericInput(input)).toBe(value);
	});

	const rejected: [string, string][] = [
		['1000000000000000000000000', INPUT_MESSAGES.integer],   // 25 integer digits
		['0,0000000000001', INPUT_MESSAGES.fraction],            // 13 fraction digits
		['1.234.567.890.123.456.789.012.345', INPUT_MESSAGES.integer],
		['=1000000000000000000000000*1', INPUT_MESSAGES.integer],
		['=2/0', INPUT_MESSAGES.formula],
		['=2*', INPUT_MESSAGES.formula],
		['abc', INPUT_MESSAGES.invalid],
		['=', INPUT_MESSAGES.formula],
	];
	it.each(rejected)('%j is rejected with a message, never rounded', (input, message) => {
		expect(parseDecimalInput(input)).toEqual({ ok: false, message });
		expect(parseNumericInput(input)).toBeNull();
	});
});

describe('display (es-PY: thousands ".", decimal ",")', () => {
	it('amounts with two decimals HALF_UP, quantities keep their digits', () => {
		expect(formatCurrency('1234567.891')).toBe('1.234.567,89');
		expect(formatCurrency('0.005')).toBe('0,01');
		expect(formatCurrency('-1234.5')).toBe('-1.234,50');
		expect(formatCurrency('0')).toBe('');
		expect(formatCurrency(LITERAL)).toBe('123.456.789.012.345.678,12');
		expect(formatAmount('0')).toBe('0,00');
		expect(formatNumber('1234.123456')).toBe('1.234,123456');
		expect(formatNumber('2')).toBe('2,00');
		expect(formatNumberForEdit('1234.5')).toBe('1234,5');
		expect(parseNumericInput(formatNumberForEdit(LITERAL))).toBe(LITERAL);
	});
});

/** Renders a component that hands out the grid's real commit function. */
async function gridCommit() {
	let commit!: ReturnType<typeof useGridEditing>['commitEdit'];
	function Probe() { commit = useGridEditing().commitEdit; return null; }
	const root = createRoot(document.createElement('div'));
	await act(async () => { root.render(<Probe />); });
	return { commit: (...args: Parameters<typeof commit>) => act(async () => { commit(...args); }), unmount: () => root.unmount() };
}

describe('grid edit', () => {
	it('typing 0,1 and 0,2 sums to exactly 0,3', async () => {
		const ch = s().addChapter(null);
		const a = s().addItem(ch);
		const b = s().addItem(ch);
		s().updateItem(a, 'quantity', '1');
		s().updateItem(b, 'quantity', '1');
		const { commit, unmount } = await gridCommit();
		const col = getColumnsForView(s().gridView, false).findIndex((c) => c.key === 'normUnitPrice');
		await commit(s().items.find((i) => i.id === a)!, col, '0,1');
		await commit(s().items.find((i) => i.id === b)!, col, '0,2');
		const chapter = s().items.find((i) => i.id === ch)!;
		expect(chapter.total).toBe('0.3'); // a float sum gives 0.30000000000000004
		expect(formatCurrency(chapter.total)).toBe('0,30');
		unmount();
	});

	it('rejects a value beyond the limits with a visible message and keeps the cell', async () => {
		const ch = s().addChapter(null);
		const a = s().addItem(ch);
		s().updateItem(a, 'normUnitPrice', '5');
		const { commit, unmount } = await gridCommit();
		const col = getColumnsForView(s().gridView, false).findIndex((c) => c.key === 'normUnitPrice');
		await commit(s().items.find((i) => i.id === a)!, col, '0,1234567890123');
		expect(s().inputError).toBe(INPUT_MESSAGES.fraction);
		expect(s().items.find((i) => i.id === a)!.normUnitPrice).toBe('5');
		await commit(s().items.find((i) => i.id === a)!, col, '7,25');
		expect(s().inputError).toBeNull();
		expect(s().items.find((i) => i.id === a)!.normUnitPrice).toBe('7.25');
		unmount();
	});
});

describe('totals panel (engine computeTotals)', () => {
	function budget(ivaMode: 'separado' | 'incluido') {
		useAppStore.setState({ schedule: { ...createDefaultSchedule(), currency: 'PYG', ivaMode } });
		const ch = s().addChapter(null);
		const a = s().addItem(ch);
		const b = s().addItem(ch);
		for (const [id, price, rate] of [[a, '1000.5', '10'], [b, '500', '5']] as const) {
			s().updateItem(id, 'quantity', '1');
			s().updateItem(id, 'normUnitPrice', price);
			s().updateItem(id, 'ivaRate', rate);
		}
	}
	async function render() {
		const host = document.createElement('div');
		const root = createRoot(host);
		await act(async () => { root.render(<BudgetTotalsPanel />); });
		const rows = [...host.querySelectorAll('.summary-row')].map((r) => r.textContent!.replace(/\s+/g, ' ').trim());
		root.unmount();
		return rows;
	}

	it('IVA separado: tax per rate on top, contract adjustment shown separately', async () => {
		budget('separado');
		const rows = await render();
		expect(rows).toContain('Costo directoGs. 1.500,50');
		expect(rows).toContain('IVA 5% — base Gs. 500,00Gs. 25,00');
		expect(rows).toContain('IVA 10% — base Gs. 1.000,50Gs. 100,05');
		expect(rows).toContain('TotalGs. 1.625,55');
		expect(rows).toContain('Ajuste contractualGs. 0,45');
		expect(rows).toContain('Total contratoGs. 1.626');
	});

	it('IVA incluido: base + tax equal each gross share', async () => {
		budget('incluido');
		const rows = await render();
		expect(rows).toContain('IVA 5% (incluido) — base Gs. 476,19Gs. 23,81');
		expect(rows).toContain('IVA 10% (incluido) — base Gs. 909,55Gs. 90,95');
		expect(rows).toContain('TotalGs. 1.500,50');
		expect(rows).toContain('Ajuste contractualGs. 0,50');
		expect(rows).toContain('Total contratoGs. 1.501');
	});

	it('the IVA mode select writes schedule.ivaMode', async () => {
		budget('separado');
		const host = document.createElement('div');
		const root = createRoot(host);
		await act(async () => { root.render(<BudgetTotalsPanel />); });
		const select = host.querySelector('select')!;
		await act(async () => {
			select.value = 'incluido';
			select.dispatchEvent(new Event('change', { bubbles: true }));
		});
		expect(s().schedule.ivaMode).toBe('incluido');
		root.unmount();
	});
});

describe('importers keep the source literal', () => {
	it('CSV: 123456789012345678.123456 survives (plain and es-PY notation)', () => {
		for (const price of [LITERAL, '123.456.789.012.345.678,123456']) {
			const data = parseCsv(`Code;Description;Unit;Quantity;Price\n01;Cap;;;\n01.01;Post;m2;1;${price}\n`, 'x');
			const post = buildFromMapping(data, autoDetectMapping(data.headers)).items.find((i) => i.code === '01.01')!;
			expect(post.materialPrice).toBe(LITERAL);
			expect(post.quantity).toBe('1');
		}
	});

	it('CSV: a literal beyond 12 decimals is rejected, not rounded', () => {
		const data = parseCsv('Code;Description;Quantity;Price\n01.01;Post;1;0.1234567890123\n', 'x');
		expect(() => buildFromMapping(data, autoDetectMapping(data.headers))).toThrow(INPUT_MESSAGES.fraction);
	});

	it('BC3: price, yield and measurement keep their literals', () => {
		const src = [
			'~V||FIEBDC-3/2016|test||ANSI|',
			'~C|R##||Obra|0||0|',
			'~C|01#||Capítulo|0||0|',
			`~C|P01|m2|Partida|${LITERAL}||0|`,
			'~C|MO|h|Peón|12345.678901234567||1|',
			'~D|R##|01\\1\\1\\|',
			'~D|01#|P01\\1\\1\\|',
			'~D|P01|MO\\1\\0.000123456789\\|',
			'~M|01#\\P01|1\\|2.5||',
		].join('\r\n');
		const items = importBc3(src).items;
		const post = items.find((i) => i.code === 'P01')!;
		const regel = items.find((i) => i.code === 'MO')!;
		expect(post.quantity).toBe('2.5');
		expect(regel.normUnitPrice).toBe('12345.678901234567');
		expect(regel.normQuantity).toBe('0.000123456789');
		const literal = importBc3(src.replace('~D|P01|MO\\1\\0.000123456789\\|\r\n', '')).items.find((i) => i.code === 'P01')!;
		expect(literal.normUnitPrice).toBe(LITERAL);
	});

	it('xlsx: decimal text from the stored value v, never the formatted w', () => {
		const ws = XLSX.utils.aoa_to_sheet([
			['Code', 'Description', 'Quantity', 'Price'],
			['01.01', 'Post', 0.1, 0.125],
		]);
		ws.D2.z = '0.00'; // shows "0.13"; the file still stores 0.125
		const wb = XLSX.utils.book_new();
		XLSX.utils.book_append_sheet(wb, ws, 'S');
		const bytes = new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
		const data = parseXlsxTabular(bytes, 'x');
		const post = buildFromMapping(data, autoDetectMapping(data.headers)).items[0];
		expect(post.quantity).toBe('0.1');
		expect(post.materialPrice).toBe('0.125');
	});
});

describe('native files', () => {
	const nativeJson = (quantity: string) => `{"version":"2.2.0","schedule":{"id":"s","name":"N","description":"","status":"DRAFT","predefinedType":"ESTIMATE","currency":"PYG","projectName":"","projectNumber":"","client":"","author":"","ifcGuid":"g","uitvoeringskosten":6,"algemeneKosten":9,"winstRisico":5},"items":[{"id":"p","parentId":null,"sortOrder":0,"code":"1","description":"Post","unit":"m2","rowType":"begrotingspost","quantity":${quantity},"materialPrice":null,"laborPrice":null,"unitPrice":0,"total":0,"isCollapsed":false,"depth":0,"notes":"","ifcGuid":"x","staartPercentage":null,"nr":"","normQuantity":null,"normFactor":null,"normDivisor":null,"normUnitPrice":0.1,"resourceType":null,"resourceLibraryId":null,"tariefGroep":null,"verrekenbaar":null}],"companyInfo":{},"spreadsheets":{"sheets":[],"activeSheetId":null},"createdAt":"","modifiedAt":""}`;

	it('.ocs/.ifcCalc JSON: numeric literals beyond double precision survive (upgradeDocumentText)', () => {
		const doc = deserializeProject(nativeJson(LITERAL));
		const post = doc.items.find((i) => i.id === 'p')!;
		expect(post.quantity).toBe(LITERAL);
		expect(post.normUnitPrice).toBe('0.1');
		expect(doc.schedule.uitvoeringskosten).toBe('6');
	});

	it('rejects a literal beyond 24 integer digits with a message', () => {
		expect(() => deserializeProject(nativeJson('1234567890123456789012345'))).toThrow(/24 integer/);
	});

	it('.ocs export writes numbers (downgradeForExport) and reads back the same budget', () => {
		const items: CostItem[] = recalculateItems(deserializeProject(nativeJson('12.5')).items);
		const schedule = { ...createDefaultSchedule(), currency: 'PYG', ivaMode: 'incluido' as const };
		const file = serializeProjectForFile(schedule, items);
		const raw = JSON.parse(file);
		expect(typeof raw.items[0].quantity).toBe('number');
		expect(raw.schedule.ivaMode).toBe('incluido');
		const back = deserializeProject(file);
		expect(back.items.map((i) => [i.id, i.quantity, i.normUnitPrice, i.total])).toEqual(items.map((i) => [i.id, i.quantity, i.normUnitPrice, i.total]));
		// The bridge keeps schema 2 strings.
		expect(JSON.parse(serializeProject(schedule, items)).items[0].quantity).toBe('12.5');
	});
});
