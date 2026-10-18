import type { ProjectFile } from '../types/costModel';
import type { BudgetStatus, HostToWebview } from '@ctrlmas/budget-engine';

// Protocol 1, unchanged; the types come from the engine's contracts (schema 2 documents).
export { BRIDGE_PROTOCOL_VERSION } from '@ctrlmas/budget-engine';
export type { BudgetStatus, HostToWebview, WebviewToHost } from '@ctrlmas/budget-engine';

// ── Validation (webview side) ────────────────────────────────────────────

const STATUSES: readonly BudgetStatus[] = ['loading', 'saved', 'pending', 'reconnecting', 'conflict', 'revoked', 'error'];

const isObject = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);
const isCount = (x: unknown): x is number => typeof x === 'number' && Number.isSafeInteger(x) && x >= 0;

/** A document the editor can open: an object with an `items` array and a `schedule` object. */
export function isProjectFileLike(x: unknown): x is ProjectFile {
	return isObject(x) && Array.isArray(x.items) && isObject(x.schedule);
}

/** The message if it is a well-formed protocol-1 host message, else null (ignore it). */
export function parseHostMessage(data: unknown): HostToWebview | null {
	if (!isObject(data) || data.v !== 1) return null;
	switch (data.type) {
		case 'load':
			return isCount(data.seq) && isCount(data.revision) && typeof data.title === 'string' && isProjectFileLike(data.document)
				? (data as unknown as HostToWebview) : null;
		case 'remote':
			return isCount(data.seq) && isCount(data.revision) && isProjectFileLike(data.document)
				? (data as unknown as HostToWebview) : null;
		case 'status':
			return STATUSES.includes(data.status as BudgetStatus) && (data.message === undefined || typeof data.message === 'string')
				? (data as unknown as HostToWebview) : null;
		default:
			return null;
	}
}

/** Spanish (Paraguay) text for the status indicator. */
export function statusText(status: BudgetStatus, message?: string): string {
	switch (status) {
		case 'loading': return 'Cargando…';
		case 'saved': return 'Guardado';
		case 'pending': return 'Guardando…';
		case 'reconnecting': return 'Reconectando…';
		case 'conflict': return `Conflicto: ${message ?? ''}`.trim();
		case 'revoked': return 'Acceso revocado';
		case 'error': return `Error: ${message ?? ''}`.trim();
	}
}

/** VS Code body classes → Open Calc Studio theme. */
export function themeFromBodyClass(classList: DOMTokenList | readonly string[]): 'light' | 'dark' | 'highContrast' {
	const has = (c: string) => (Array.isArray(classList) ? classList.includes(c) : (classList as DOMTokenList).contains(c));
	if (has('vscode-high-contrast') || has('vscode-high-contrast-light')) return 'highContrast';
	if (has('vscode-dark')) return 'dark';
	return 'light';
}
