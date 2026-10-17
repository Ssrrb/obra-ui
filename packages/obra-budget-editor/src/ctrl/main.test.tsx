/**
 * End-to-end over the real webview entry: src/ctrl/main.tsx mounted in jsdom
 * with a fake acquireVsCodeApi, the real OpenCalcStudio and its debounced
 * onChange (300 ms), driven by window 'message' events like VS Code does.
 */
import { describe, it, expect, beforeAll, vi } from 'vitest';
import { act } from 'react';
import { useAppStore } from '@/state/appStore';
import { serializeProject } from '@/services/file/fileService';
import { createDefaultSchedule } from '@/data/defaultBudget';
import { buildFromMapping, parseCsv, autoDetectMapping } from '@/services/importers/genericTabularImporter';
import type { ProjectFile } from '@/types/costModel';

// Before any import evaluates services/buildFlags.ts.
vi.hoisted(() => { vi.stubEnv('VITE_CTRL_BUILD', 'true'); });

const posted: any[] = [];
const wait = (ms: number) => act(async () => { await new Promise((r) => setTimeout(r, ms)); });
const send = (data: unknown) => act(async () => { window.dispatchEvent(new MessageEvent('message', { data })); });

function doc(): ProjectFile {
	const data = parseCsv('Code;Description;Unit;Quantity;Price\n01;Obras preliminares;;;\n01.01;Limpieza;m2;100;5000\n', 'x');
	const items = buildFromMapping(data, autoDetectMapping(data.headers)).items;
	return JSON.parse(serializeProject(createDefaultSchedule(), items)) as ProjectFile;
}

beforeAll(async () => {
	(globalThis as any).IS_REACT_ACT_ENVIRONMENT = true;
	(globalThis as any).ResizeObserver ??= class { observe() {} unobserve() {} disconnect() {} };
	(globalThis as any).acquireVsCodeApi = () => ({ postMessage: (m: unknown) => posted.push(m) });
	document.body.className = 'vscode-light';
	const root = document.createElement('div');
	root.id = 'root';
	document.body.appendChild(root);
	await act(async () => { await import('./main'); });
	await wait(100);
}, 60000);

describe('ctrl webview entry', () => {
	it('posts ready on start and renders the editor in #root with the loading status', () => {
		expect(posted[0]).toEqual({ v: 1, type: 'ready' });
		expect(document.querySelector('#root .ocs-embed')).not.toBeNull();
		expect(document.querySelector('.ctrl-status')!.textContent).toBe('Cargando…');
	});

	it('hides local file, chat and window chrome in the ctrl build', () => {
		expect(document.querySelector('.titlebar')).toBeNull();
		expect(document.querySelector('.chat-fab')).toBeNull();
		expect(document.querySelector('.start-sidebar')).toBeNull();
	});

	it('load opens one document and does not echo it back', async () => {
		await send({ v: 1, type: 'load', seq: 1, revision: 1, document: doc(), title: 'Casa Pérez' });
		await wait(400);
		expect(useAppStore.getState().documents).toHaveLength(1);
		expect(useAppStore.getState().items.some((i) => i.description === 'Limpieza')).toBe(true);
		expect(posted.filter((m) => m.type === 'changed')).toHaveLength(0);
	});

	it('ignores malformed messages', async () => {
		await send({ v: 1, type: 'load', seq: 9, revision: 1, document: { items: 'no' }, title: 'x' });
		await send({ v: 2, type: 'remote', seq: 9, revision: 1, document: doc() });
		await wait(400);
		expect(useAppStore.getState().documents).toHaveLength(1);
		expect(posted.filter((m) => m.type === 'changed')).toHaveLength(0);
	});

	it('remote replaces the content without a new tab, an undo entry or a changed post', async () => {
		const remote = doc();
		const id = useAppStore.getState().items.find((i) => i.description === 'Limpieza')!.id;
		remote.items = useAppStore.getState().items.map((i) => (i.id === id ? { ...i, description: 'Limpieza del terreno' } : i));
		await send({ v: 1, type: 'remote', seq: 2, revision: 2, document: remote });
		await wait(400);
		const s = useAppStore.getState();
		expect(s.documents).toHaveLength(1);
		expect(s.items.find((i) => i.id === id)!.description).toBe('Limpieza del terreno');
		expect(s.canUndo()).toBe(false);
		expect(posted.filter((m) => m.type === 'changed')).toHaveLength(0);
	});

	it('a user edit posts changed once, debounced, with the last seq', async () => {
		const s = useAppStore.getState();
		const id = s.items.find((i) => i.description === 'Limpieza del terreno')!.id;
		await act(async () => { s.updateItem(id, 'quantity', 120); });
		await wait(100);
		expect(posted.filter((m) => m.type === 'changed')).toHaveLength(0);
		await wait(350);
		const changed = posted.filter((m) => m.type === 'changed');
		expect(changed).toHaveLength(1);
		expect(changed[0].seq).toBe(2);
		expect(changed[0].document.items.find((i: any) => i.id === id).quantity).toBe(120);
	});

	it('an edit inside the debounce is flushed with the previous seq before a remote, with no stale post later', async () => {
		const before = posted.filter((m) => m.type === 'changed').length;
		const s = useAppStore.getState();
		const id = s.items.find((i) => i.description === 'Limpieza del terreno')!.id;
		await act(async () => { s.updateItem(id, 'quantity', 130); });
		await wait(100); // debounce still pending
		const remote = JSON.parse(JSON.stringify({ ...doc(), items: useAppStore.getState().items })) as ProjectFile;
		remote.items = remote.items.map((i) => (i.id === id ? { ...i, quantity: 120, notes: 'remoto' } : i));
		await send({ v: 1, type: 'remote', seq: 3, revision: 3, document: remote });
		let changed = posted.filter((m) => m.type === 'changed');
		expect(changed).toHaveLength(before + 1);
		expect(changed.at(-1).seq).toBe(2);
		expect(changed.at(-1).document.items.find((i: any) => i.id === id).quantity).toBe(130);
		expect(useAppStore.getState().items.find((i) => i.id === id)!.notes).toBe('remoto');
		await wait(450);
		changed = posted.filter((m) => m.type === 'changed');
		expect(changed).toHaveLength(before + 1);
	});

	it('follows the VS Code theme', async () => {
		const wrapper = document.querySelector('#root .ocs-embed')!;
		expect(wrapper.getAttribute('data-theme')).toBe('light');
		await act(async () => { document.body.className = 'vscode-dark'; });
		await wait(20);
		expect(wrapper.getAttribute('data-theme')).toBe('dark');
		await act(async () => { document.body.className = 'vscode-high-contrast'; });
		await wait(20);
		expect(wrapper.getAttribute('data-theme')).toBe('highContrast');
	});

	it('shows status texts, and on revoked only the message', async () => {
		await send({ v: 1, type: 'status', status: 'conflict', message: 'versión nueva en el servidor' });
		expect(document.querySelector('.ctrl-status')!.textContent).toBe('Conflicto: versión nueva en el servidor');
		const before = posted.length;
		await send({ v: 1, type: 'status', status: 'revoked' });
		await wait(400);
		expect(document.querySelector('#root .ocs-embed')).toBeNull();
		expect(document.querySelector('#root')!.textContent).toBe('Acceso revocado');
		expect(useAppStore.getState().documents).toHaveLength(0);
		expect(posted.length).toBe(before);
	});
});
