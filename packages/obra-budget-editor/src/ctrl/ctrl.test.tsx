import { describe, it, expect, beforeEach } from 'vitest';
import * as XLSX from 'xlsx';
import { useAppStore } from '@/state/appStore';
import { serializeProject } from '@/services/file/fileService';
import { createDefaultItems, createDefaultSchedule } from '@/data/defaultBudget';
import { parseXlsxTabular, autoDetectMapping, buildFromMapping } from '@/services/importers/genericTabularImporter';
import { recalculateItems } from '@/services/calculation/calculator';
import type { ProjectFile } from '@/types/costModel';
import { parseHostMessage, statusText, themeFromBodyClass, type WebviewToHost } from './bridge';
import { createBridgeController } from './controller';

function xlsxFixture(): Uint8Array {
	// Synthetic workbook; never commit real budget files.
	const ws = XLSX.utils.aoa_to_sheet([
		['Code', 'Description', 'Unit', 'Quantity', 'Price'],
		['01', 'Movimiento de suelo', '', '', ''],
		['01.01', 'Excavación', 'm3', 12, 85000],
		['01.02', 'Relleno compactado', 'm3', 8, 60000],
	]);
	const wb = XLSX.utils.book_new();
	XLSX.utils.book_append_sheet(wb, ws, 'Presupuesto');
	return new Uint8Array(XLSX.write(wb, { type: 'array', bookType: 'xlsx' }) as ArrayBuffer);
}


/** A small budget (chapter + posts) from the xlsx fixture plus the default staart rows. */
const BASE_ITEMS = (() => {
	const data = parseXlsxTabular(xlsxFixture(), 'presupuesto');
	return [...buildFromMapping(data, autoDetectMapping(data.headers)).items, ...createDefaultItems()];
})();

function makeDoc(mutate?: (d: ProjectFile) => void): ProjectFile {
	const d = JSON.parse(serializeProject(createDefaultSchedule(), BASE_ITEMS)) as ProjectFile;
	mutate?.(d);
	return d;
}

/** What the embed's onChange hands over: the store serialized as a project file. */
function currentProject(): ProjectFile {
	const s = useAppStore.getState();
	return JSON.parse(serializeProject(s.schedule, s.items, s.companyInfo, s.subSheets, s.offerte)) as ProjectFile;
}

function setup() {
	const posted: WebviewToHost[] = [];
	const statuses: string[] = [];
	const c = createBridgeController((m) => posted.push(m), (s, m) => statuses.push(statusText(s, m)));
	return { c, posted, statuses };
}

beforeEach(() => {
	useAppStore.setState(useAppStore.getInitialState(), true);
});

describe('bridge message validation', () => {
	const doc = makeDoc();
	it('accepts well-formed protocol-1 messages', () => {
		expect(parseHostMessage({ v: 1, type: 'load', seq: 1, revision: 3, document: doc, title: 'Casa' })?.type).toBe('load');
		expect(parseHostMessage({ v: 1, type: 'remote', seq: 2, revision: 4, document: doc })?.type).toBe('remote');
		expect(parseHostMessage({ v: 1, type: 'status', status: 'saved' })?.type).toBe('status');
		expect(parseHostMessage({ v: 1, type: 'status', status: 'conflict', message: 'x' })?.type).toBe('status');
	});
	it('ignores anything else', () => {
		for (const bad of [
			null, 'load', 42, [],
			{ v: 2, type: 'load', seq: 1, revision: 1, document: doc, title: 't' },
			{ type: 'load', seq: 1, revision: 1, document: doc, title: 't' },
			{ v: 1, type: 'boom' },
			{ v: 1, type: 'load', revision: 1, document: doc, title: 't' },
			{ v: 1, type: 'load', seq: 1, revision: 1, document: doc },
			{ v: 1, type: 'load', seq: -1, revision: 1, document: doc, title: 't' },
			{ v: 1, type: 'remote', seq: 1, revision: 1, document: { ...doc, items: {} } },
			{ v: 1, type: 'remote', seq: 1, revision: 1, document: null },
			{ v: 1, type: 'remote', seq: 1, revision: 1, document: { items: [] } },
			{ v: 1, type: 'status', status: 'happy' },
			{ v: 1, type: 'status', status: 'error', message: 3 },
		]) {
			expect(parseHostMessage(bad)).toBeNull();
		}
	});
	it('has Spanish status texts', () => {
		expect(statusText('loading')).toBe('Cargando…');
		expect(statusText('saved')).toBe('Guardado');
		expect(statusText('pending')).toBe('Guardando…');
		expect(statusText('reconnecting')).toBe('Reconectando…');
		expect(statusText('conflict', 'otra edición')).toBe('Conflicto: otra edición');
		expect(statusText('revoked')).toBe('Acceso revocado');
		expect(statusText('error', 'sin red')).toBe('Error: sin red');
	});
});

describe('theme mapping', () => {
	it('maps VS Code body classes to Open Calc Studio themes', () => {
		expect(themeFromBodyClass(['vscode-light'])).toBe('light');
		expect(themeFromBodyClass(['vscode-dark'])).toBe('dark');
		expect(themeFromBodyClass(['vscode-high-contrast'])).toBe('highContrast');
		expect(themeFromBodyClass(['vscode-high-contrast-light'])).toBe('highContrast');
		expect(themeFromBodyClass([])).toBe('light');
		document.body.className = 'vscode-body vscode-dark';
		expect(themeFromBodyClass(document.body.classList)).toBe('dark');
	});
});

describe('bridge controller', () => {
	it('load opens exactly one document, also when load repeats', () => {
		const { c, posted } = setup();
		c.handle({ v: 1, type: 'load', seq: 1, revision: 1, document: makeDoc(), title: 'Casa' });
		const s = useAppStore.getState();
		expect(s.documents).toHaveLength(1);
		expect(s.documents[0].fileName).toBe('Casa');
		expect(s.items.length).toBeGreaterThan(0);
		const id = s.activeDocumentId;

		c.handle({ v: 1, type: 'load', seq: 2, revision: 2, document: makeDoc(), title: 'Casa 2' });
		expect(useAppStore.getState().documents).toHaveLength(1);
		expect(useAppStore.getState().activeDocumentId).toBe(id);
		c.onChange(currentProject());
		expect(posted).toHaveLength(0);
		c.dispose();
	});

	it('remote replaces content in place: no tab, no undo entry, no echo, view state kept', () => {
		const { c, posted } = setup();
		const base = makeDoc();
		c.handle({ v: 1, type: 'load', seq: 1, revision: 1, document: base, title: 'Casa' });
		const store = useAppStore.getState();
		const docId = store.activeDocumentId;
		const chapter = store.items.find((i) => i.rowType === 'chapter')!;
		const target = store.items.find((i) => i.rowType !== 'chapter' && i.id !== chapter.id)!;

		// Local state: a user edit with undo history, a collapsed chapter, a selected row.
		store.pushHistory(store.items, 'edit');
		store.updateItem(target.id, 'description', 'local');
		store.toggleCollapse(chapter.id);
		const rows = useAppStore.getState().getGridRows();
		const row = Math.max(rows.findIndex((r) => r.id === chapter.id), 0);
		store.setActiveCell(row, 1, chapter.id);
		expect(useAppStore.getState().canUndo()).toBe(true);

		const remote = makeDoc((d) => {
			d.items = base.items.map((i) => (i.id === target.id ? { ...i, description: 'from remote' } : i));
		});
		c.handle({ v: 1, type: 'remote', seq: 7, revision: 2, document: remote });

		const s = useAppStore.getState();
		expect(s.documents).toHaveLength(1);
		expect(s.activeDocumentId).toBe(docId);
		expect(s.items.find((i) => i.id === target.id)!.description).toBe('from remote');
		expect(s.undoStack).toHaveLength(0);
		expect(s.canUndo()).toBe(false);
		expect(s.items.find((i) => i.id === chapter.id)!.isCollapsed).toBe(true);
		expect(s.activeItemId).toBe(chapter.id);

		// The unposted local edit went out first (against seq 1); the remote itself is not echoed.
		expect(posted).toHaveLength(1);
		expect(posted[0]).toMatchObject({ v: 1, type: 'changed', seq: 1 });
		c.onChange(currentProject());
		expect(posted).toHaveLength(1);

		// The next user edit is posted against the remote's seq.
		s.updateItem(target.id, 'description', 'mine');
		c.onChange(currentProject());
		expect(posted).toHaveLength(2);
		expect(posted[1]).toMatchObject({ v: 1, type: 'changed', seq: 7 });
		c.dispose();
	});

	it('a user edit posts changed with the full document and the last seq', () => {
		const { c, posted } = setup();
		const base = makeDoc((d) => { (d as any).brandSlug = 'obra'; });
		c.handle({ v: 1, type: 'load', seq: 3, revision: 1, document: base, title: 'Casa' });
		const item = useAppStore.getState().items.find((i) => i.rowType !== 'chapter')!;
		useAppStore.getState().updateItem(item.id, 'description', 'Excavación');
		c.onChange(currentProject());
		expect(posted).toHaveLength(1);
		const msg = posted[0] as Extract<WebviewToHost, { type: 'changed' }>;
		expect(msg.seq).toBe(3);
		expect(msg.document.items.find((i) => i.id === item.id)!.description).toBe('Excavación');
		expect(msg.document.brandSlug).toBe('obra');
		c.dispose();
	});

	it('an unposted user edit is posted (previous seq) before a remote is applied, and not again', () => {
		const order: string[] = [];
		const posted: WebviewToHost[] = [];
		const c = createBridgeController((m) => {
			posted.push(m);
			order.push(`post:${useAppStore.getState().items.find((i) => i.description === 'Remoto') ? 'after' : 'before'}-remote`);
		});
		const base = makeDoc();
		c.handle({ v: 1, type: 'load', seq: 5, revision: 1, document: base, title: 'Casa' });
		const target = base.items.find((i) => i.description === 'Excavación')!;
		const other = base.items.find((i) => i.description === 'Relleno compactado')!;

		// User edit; the embed's 300 ms debounce has not fired yet.
		useAppStore.getState().updateItem(target.id, 'quantity', 99);
		const remote = makeDoc((d) => {
			d.items = base.items.map((i) => (i.id === other.id ? { ...i, description: 'Remoto' } : i));
		});
		c.handle({ v: 1, type: 'remote', seq: 6, revision: 2, document: remote });

		expect(posted).toHaveLength(1);
		expect(order).toEqual(['post:before-remote']);
		const msg = posted[0] as Extract<WebviewToHost, { type: 'changed' }>;
		expect(msg.seq).toBe(5);
		expect(msg.document.items.find((i) => i.id === target.id)!.quantity).toBe(99);
		expect(useAppStore.getState().items.find((i) => i.id === other.id)!.description).toBe('Remoto');

		// The stale debounce then fires: nothing more is posted.
		c.onChange(currentProject());
		expect(posted).toHaveLength(1);

		// A remote with no unposted edit posts nothing.
		c.handle({ v: 1, type: 'remote', seq: 7, revision: 3, document: remote });
		expect(posted).toHaveLength(1);
		c.dispose();
	});

	it('revoked clears the document and stops posting', () => {
		const { c, posted, statuses } = setup();
		c.handle({ v: 1, type: 'load', seq: 1, revision: 1, document: makeDoc(), title: 'Casa' });
		c.handle({ v: 1, type: 'status', status: 'revoked' });
		expect(useAppStore.getState().documents).toHaveLength(0);
		expect(useAppStore.getState().items).toHaveLength(0);
		expect(statuses).toEqual(['Acceso revocado']);
		c.onChange(currentProject());
		c.handle({ v: 1, type: 'remote', seq: 2, revision: 2, document: makeDoc() });
		expect(useAppStore.getState().documents).toHaveLength(0);
		expect(posted).toHaveLength(0);
		c.dispose();
	});
});

describe('Excel import', () => {
	it('turns an .xlsx into items with the upstream Excel/CSV importer', () => {
		const data = parseXlsxTabular(xlsxFixture(), 'presupuesto');
		expect(data.headers).toEqual(['Code', 'Description', 'Unit', 'Quantity', 'Price']);
		const result = buildFromMapping(data, autoDetectMapping(data.headers));
		const descriptions = result.items.map((i) => i.description);
		expect(descriptions).toEqual(expect.arrayContaining(['Movimiento de suelo', 'Excavación', 'Relleno compactado']));
		expect(result.items.find((i) => i.description === 'Excavación')!.quantity).toBe(12);
	});

	it('an import replaces the host document instead of opening a second tab, and is posted', () => {
		const { c, posted } = setup();
		c.handle({ v: 1, type: 'load', seq: 4, revision: 1, document: makeDoc(), title: 'Casa' });
		const docId = useAppStore.getState().activeDocumentId;
		// Same steps as Backstage.handleMappingConfirm (newFile → setSchedule → setItems → updateDocument).
		const data = parseXlsxTabular(xlsxFixture(), 'presupuesto');
		const result = buildFromMapping(data, autoDetectMapping(data.headers));
		const store = useAppStore.getState();
		store.addDocument({ id: crypto.randomUUID(), filePath: null, fileName: 'Nuevo', isModified: false });
		store.setSchedule(result.schedule);
		store.setItems(recalculateItems(result.items));
		store.updateDocument(useAppStore.getState().activeDocumentId, { fileName: data.sourceName, isModified: true });

		const s = useAppStore.getState();
		expect(s.documents).toHaveLength(1);
		expect(s.activeDocumentId).toBe(docId);
		c.onChange(currentProject());
		expect(posted).toHaveLength(1);
		const msg = posted[0] as Extract<WebviewToHost, { type: 'changed' }>;
		expect(msg.seq).toBe(4);
		expect(msg.document.items.some((i) => i.description === 'Excavación')).toBe(true);
		c.dispose();
	});
});
