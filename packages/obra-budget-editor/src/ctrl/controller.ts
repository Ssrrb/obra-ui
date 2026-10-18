/**
 * Store side of the ctrl bridge: opens the host's document once, applies
 * remote documents in place, and decides when a store change is a user edit
 * worth posting. Pure store logic (no React), so it is unit-testable.
 */
import { useAppStore } from '../state/appStore';
import { deserializeProject, serializeProject } from '../services/file/fileService';
import { openProjectInStore } from '../services/file/openProject';
import type { ProjectFile } from '../types/costModel';
import type { BudgetStatus, HostToWebview, WebviewToHost } from './bridge';

/** Store fields that make up the document (same set the embed's onChange watches). */
function docRefs() {
	const s = useAppStore.getState();
	return [s.items, s.schedule, s.companyInfo, s.subSheets, s.offerte] as const;
}

/** Host documents go through the normal file reader (migrations, version check). */
function normalize(doc: ProjectFile): ProjectFile {
	return deserializeProject(JSON.stringify(doc));
}

/**
 * Replace the active document's content with `doc`, in place: no new tab and
 * no undo entry. Expanded/collapsed state and the active row are kept for ids
 * that still exist. The undo/redo stacks are cleared because their entries
 * are full item snapshots: undoing past a remote change would revert it.
 */
export function applyRemoteDocument(documentId: string, doc: ProjectFile): void {
	const store = useAppStore.getState();
	const collapsed = new Map(store.items.map((i) => [i.id, i.isCollapsed]));
	const items = doc.items.map((i) => (collapsed.has(i.id) ? { ...i, isCollapsed: collapsed.get(i.id)! } : i));
	const activeItemId = store.activeItemId;

	store.setItems(items); // recalculates
	useAppStore.setState({ schedule: doc.schedule });
	if (doc.schedule.projectInfo) store.setProjectInfo(doc.schedule.projectInfo);
	if (doc.companyInfo) store.setCompanyInfo(doc.companyInfo);
	if (doc.offerte) store.setOfferte(doc.offerte);
	const sheets = doc.spreadsheets?.sheets ?? doc.subSheets ?? [];
	const activeSubSheetId = store.activeSubSheetId;
	useAppStore.setState({
		subSheets: sheets,
		activeSubSheetId: activeSubSheetId && sheets.some((s) => s.id === activeSubSheetId) ? activeSubSheetId : null,
	});

	const s = useAppStore.getState();
	store.updateDocument(documentId, { items: s.items, schedule: s.schedule, isModified: false });
	useAppStore.setState({ undoStack: [], redoStack: [], spreadsheetUndo: [], spreadsheetRedo: [] });

	// Selection: follow the active item to its new row, or drop it.
	const rows = s.getGridRows();
	const row = activeItemId ? rows.findIndex((r) => r.id === activeItemId) : -1;
	if (row >= 0) {
		if (row !== s.activeRow) useAppStore.setState({ activeRow: row, selectionStart: null, selectionEnd: null, cellSelectionStart: null, cellSelectionEnd: null });
	} else if (activeItemId) {
		useAppStore.setState({
			activeItemId: null,
			activeRow: Math.min(s.activeRow, Math.max(rows.length - 1, 0)),
			isEditing: false,
			selectionStart: null, selectionEnd: null, cellSelectionStart: null, cellSelectionEnd: null,
		});
	}
}

/**
 * The embed serializes only what the app writes to a new file. Keep the
 * host document's other top-level fields (e.g. snapshots, brandSlug,
 * createdAt) and the store's project info (kept outside `schedule`, as the
 * desktop save path does), so posting an edit does not drop them.
 */
function withHostFields(project: ProjectFile, host: ProjectFile | null): ProjectFile {
	const own = Object.fromEntries(Object.entries(project).filter(([, v]) => v !== undefined)) as Partial<ProjectFile>;
	const projectInfo = useAppStore.getState().projectInfo;
	return {
		...(host ?? {}),
		...own,
		createdAt: host?.createdAt ?? project.createdAt,
		schedule: { ...project.schedule, projectInfo },
	} as ProjectFile;
}

export interface BridgeController {
	/** Handle one validated host message. */
	handle(msg: HostToWebview): void;
	/** The embed's (debounced) onChange: posts `changed` unless the change came from the host. */
	onChange(project: ProjectFile): void;
	dispose(): void;
}

export function createBridgeController(
	post: (msg: WebviewToHost) => void,
	onStatus: (status: BudgetStatus, message?: string) => void = () => {},
): BridgeController {
	let documentId: string | null = null;
	let seq = 0;
	let revoked = false;
	/** Document refs right after the last host-applied document: equal refs = nothing the user did. */
	let applied: readonly unknown[] | null = null;
	/** Last document from the host, for top-level fields the embed does not serialize (snapshots, brandSlug, …). */
	let hostDoc: ProjectFile | null = null;

	const markApplied = () => { applied = docRefs(); };
	/** Store holds a user change not yet posted (debounce pending or not). */
	const hasUnposted = () => applied !== null && docRefs().some((r, i) => r !== applied![i]);
	/** Post the store's document now, against the last applied seq. */
	const postNow = (project: ProjectFile) => {
		post({ v: 1, type: 'changed', seq, document: withHostFields(project, hostDoc) });
		markApplied(); // the embed's pending debounce then finds nothing new and posts nothing
	};
	const storeProject = (): ProjectFile => {
		const s = useAppStore.getState();
		return JSON.parse(serializeProject(s.schedule, s.items, s.companyInfo, s.subSheets, s.offerte)) as ProjectFile;
	};

	// One document per webview: importers (Excel/CSV, .bc3, …) open their
	// result through newFile() as a new tab. Fold any extra tab back into the
	// host's document so the import replaces its content instead.
	const unsubscribe = useAppStore.subscribe((s) => {
		if (!documentId || s.documents.length <= 1) return;
		const primary = s.documents.find((d) => d.id === documentId);
		if (!primary) return;
		// The budget's currency and IVA mode belong to the host document, not the imported file.
		const schedule = hostDoc
			? { ...s.schedule, currency: hostDoc.schedule.currency, ivaMode: hostDoc.schedule.ivaMode }
			: s.schedule;
		useAppStore.setState({
			schedule,
			documents: [{ ...primary, items: s.items, schedule }],
			activeDocumentId: documentId,
		});
	});

	function clearDocument() {
		if (documentId) useAppStore.getState().removeDocument(documentId);
		documentId = null;
		useAppStore.setState({ undoStack: [], redoStack: [], spreadsheetUndo: [], spreadsheetRedo: [] });
	}

	return {
		handle(msg) {
			if (msg.type === 'status') {
				onStatus(msg.status, msg.message);
				if (msg.status === 'revoked') {
					revoked = true;
					clearDocument();
				}
				return;
			}
			if (revoked && msg.type === 'remote') return;
			// An edit the user made since the last post (e.g. inside the 300 ms
			// debounce) would be overwritten by this document: post it first,
			// against the seq it was made on, so the host can rebase it.
			if (!revoked && documentId !== null && hasUnposted()) postNow(storeProject());
			let doc: ProjectFile;
			try {
				doc = normalize(msg.document);
			} catch (err) {
				onStatus('error', err instanceof Error ? err.message : String(err));
				return;
			}
			if (msg.type === 'load' && documentId === null) {
				revoked = false;
				documentId = openProjectInStore(doc, msg.title);
				useAppStore.setState({ undoStack: [], redoStack: [], spreadsheetUndo: [], spreadsheetRedo: [] });
			} else if (documentId !== null) {
				applyRemoteDocument(documentId, doc);
				if (msg.type === 'load') useAppStore.getState().updateDocument(documentId, { fileName: msg.title });
			} else {
				return; // remote before load
			}
			seq = msg.seq;
			hostDoc = doc;
			markApplied();
		},
		onChange(project) {
			if (revoked || documentId === null) return;
			if (!hasUnposted()) return;
			postNow(project);
		},
		dispose() {
			unsubscribe();
		},
	};
}
