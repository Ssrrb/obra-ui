import type { ProjectFile } from '../types/costModel';

// Copied verbatim from ctrl `obra-budget-engine/src/contracts.ts` (branch feat/budgets-slice, unchanged through 99fce38efb3); do not change here.
export const BRIDGE_PROTOCOL_VERSION = 1;

export type BudgetStatus = 'loading' | 'saved' | 'pending' | 'reconnecting' | 'conflict' | 'revoked' | 'error';

/**
 * `seq` orders the documents the host posts. `changed` names the last `seq`
 * the webview applied, so the host takes only the user's edits relative to
 * that document and never reverts a remote change still in flight.
 */
export type HostToWebview =
	| { readonly v: 1; readonly type: 'load'; readonly seq: number; readonly revision: number; readonly document: ProjectFile; readonly title: string }
	| { readonly v: 1; readonly type: 'remote'; readonly seq: number; readonly revision: number; readonly document: ProjectFile }
	| { readonly v: 1; readonly type: 'status'; readonly status: BudgetStatus; readonly message?: string };

export type WebviewToHost =
	| { readonly v: 1; readonly type: 'ready' }
	| { readonly v: 1; readonly type: 'changed'; readonly seq: number; readonly document: ProjectFile };

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
