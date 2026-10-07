/**
 * Surface: cost-control — the Phase 9 benchmark workspace.
 *
 * Built ONLY from @obra/ui custom elements (Principle 3) over --obra-* tokens
 * (Principles 4, 5); plain elements are semantic/layout carriers styled by
 * src/harness.css. The contract is ux/cost-control.yaml: project + section
 * navigation, labeled filters with a live result count, a DataTable with raw
 * values behind formatted display, an editable detail pane with guarded
 * pending edits, permission-driven read-only behavior, and a deterministic
 * MOCK AI review whose proposals change financial data only after explicit
 * confirmation AND the correlated host acknowledgment.
 *
 * Rendering discipline: the shell is built once (shell.ts); every render pass
 * updates panes/attributes in place, keyed so a keystroke in the search field
 * re-renders only the table and the result count — never the focused subtree.
 *
 * Host bridge: getState() on mount, postMessage() out (requestId-correlated),
 * `message` events in, validated by guards.ts. Unknown/malformed messages are
 * ignored, never guessed at.
 *
 * `.obra-cost-control` + `data-state` are the stable selectors shared with
 * tests/visual.spec.ts and scripts/ui/flows/cost-control.mjs.
 */
import type { ObraSelect, ObraTextField, DataTableColumn } from '@obra/ui';
import type {
  CostAnalysisPayload,
  CostControlDataPayload,
  CostControlHostMessage,
  CostControlPersistedState,
  CostItemStatus,
  CostRow,
  ProjectSummary,
} from '../../../fixtures/protocol.js';
import { COST_ITEM_STATUSES } from '../../../fixtures/protocol.js';
import { el } from '../../dom.js';
import type { VsCodeApi } from '../../vscode-api.js';
import type { HarnessSurface } from '../types.js';
import { aiReduce, AI_IDLE } from './ai.js';
import type { AiState } from './ai.js';
import {
  ALL,
  categoryTotals,
  distinctCategories,
  distinctStatuses,
  filterRows,
  NO_FILTERS,
} from './filtering.js';
import type { CostFilters } from './filtering.js';
import { formatMoney, parseMoney, validateItemName } from './money.js';
import {
  isAnalysisPayload,
  isDataPayload,
  isMessagePayload,
  isProjectsPayload,
  isRecord,
} from './guards.js';
import {
  buildShell,
  focusButton,
  focusInner,
  isSectionId,
  labelInnerControl,
  sectionTabId,
  setSelectOptions,
  setSelectValue,
} from './shell.js';
import type { SectionId } from './shell.js';

type ViewState = 'loading' | 'ready' | 'empty' | 'error' | 'permission-denied';

const COLUMNS: DataTableColumn[] = [
  { key: 'name', header: 'Line item' },
  { key: 'category', header: 'Category' },
  { key: 'status', header: 'Status' },
  { key: 'cost', header: 'Amount', align: 'end' },
];

const DEFAULT_CATEGORIES = ['Compute', 'Storage', 'Network', 'Licenses', 'Labor'];

const HINTS: Record<ViewState, string> = {
  loading: 'Waiting for the cost service to respond…',
  ready: 'Select a line item to inspect it. Refresh re-requests the latest data.',
  empty: 'Costs appear here as soon as they are recorded.',
  error: 'The cost service failed. Retry re-sends the request.',
  'permission-denied': 'Access is controlled by the obra.cost.read scope. Retrying cannot grant it.',
};

interface EditDraft {
  readonly id: string;
  name: string;
  category: string;
  status: CostItemStatus;
  costText: string;
  dirty: boolean;
}

export const costControlSurface: HarnessSurface = {
  id: 'cost-control',

  mount(root: HTMLElement, api: VsCodeApi): () => void {
    const persisted = api.getState() as CostControlPersistedState | undefined;
    const refs = buildShell();

    // ---- state -------------------------------------------------------------
    let view: ViewState = 'loading';
    let data: CostControlDataPayload | null = null;
    let dataVersion = 0;
    let projects: readonly ProjectSummary[] = [];
    let statusMessage = '';
    let selectedId: string | null = persisted?.selectedId ?? null;
    let section: SectionId = isSectionId(persisted?.section) ? persisted.section : 'items';
    let filters: CostFilters = NO_FILTERS;
    let addOpen = false;
    let addPending = false;
    let addDirty = false;
    let activeProjectId = persisted?.projectId ?? 'aurora';
    let editDraft: EditDraft | null = null;
    let editPending = false;
    let editError = '';
    let ai: AiState = AI_IDLE;
    let applyRequestId: string | null = null;
    /** requestId of the in-flight data-channel request (refresh/switch/mutation). */
    let expectedRequestId: string | null = null;
    let requestCounter = 0;

    // Render keys: a sub-pane re-renders only when its key changes, so typing
    // in the search field never reconstructs the filter subtree (caret/focus).
    let tableKey: string | null = null;
    let detailKey: string | null = null;
    let summaryKey: string | null = null;
    let aiKey: string | null = null;
    let projectKey: string | null = null;
    let filterOptionsKey: string | null = null;

    function nextRequestId(): string {
      requestCounter += 1;
      return `cc-req-${requestCounter}`;
    }

    function setStatus(text: string): void {
      refs.status.textContent = text;
    }

    function persist(): void {
      api.setState({
        selectedId,
        projectId: data?.projectId ?? persisted?.projectId ?? null,
        section,
      } satisfies CostControlPersistedState);
    }

    function canEdit(): boolean {
      return data?.permissions?.canEdit ?? true;
    }
    function canAnalyze(): boolean {
      return data?.permissions?.canAnalyze ?? true;
    }
    function currentProjectId(): string {
      return data?.projectId ?? activeProjectId;
    }
    function selectedRow(): CostRow | undefined {
      return data?.rows.find((row) => row.id === selectedId);
    }

    // ---- confirmation dialog routing ---------------------------------------
    let confirmActions: { onConfirm: () => void; onCancel?: () => void } | null = null;

    function askConfirm(
      options: { heading: string; message: string; confirmLabel: string; danger?: boolean },
      onConfirm: () => void,
      onCancel?: () => void,
    ): void {
      confirmActions = { onConfirm, onCancel };
      refs.confirmDialog.setAttribute('heading', options.heading);
      refs.confirmDialog.setAttribute('message', options.message);
      refs.confirmDialog.setAttribute('confirm-label', options.confirmLabel);
      refs.confirmDialog.setAttribute('cancel-label', 'Cancel');
      if (options.danger) refs.confirmDialog.setAttribute('danger', '');
      else refs.confirmDialog.removeAttribute('danger');
      refs.confirmDialog.open();
    }

    refs.confirmDialog.addEventListener('obra-confirm', () => {
      const actions = confirmActions;
      confirmActions = null;
      actions?.onConfirm();
    });
    refs.confirmDialog.addEventListener('obra-cancel', () => {
      const actions = confirmActions;
      confirmActions = null;
      actions?.onCancel?.();
    });

    // ---- host bridge ---------------------------------------------------------
    api.postMessage({ type: 'cost-control/ready' });
    setStatus('Loading costs…');

    function isStaleDataAnswer(requestId: string | undefined): boolean {
      // Strict correlation: an answer that carries a requestId is accepted
      // ONLY while that exact request is in flight. Uncorrelated fixture
      // pushes are accepted only when no request is awaiting acknowledgment.
      if (expectedRequestId !== null) return requestId !== expectedRequestId;
      return requestId !== undefined;
    }

    function applyData(payload: CostControlDataPayload, requestId: string | undefined): void {
      data = payload;
      activeProjectId = payload.projectId;
      dataVersion += 1;
      view = payload.rows.length > 0 ? 'ready' : 'empty';
      statusMessage = view === 'empty' ? 'No cost lines recorded for this project yet.' : '';
      expectedRequestId = null;

      if (selectedId !== null && !payload.rows.some((row) => row.id === selectedId)) selectedId = null;

      const applied = applyRequestId !== null && requestId === applyRequestId;
      if (applied) {
        ai = aiReduce(ai, { type: 'applied' });
        applyRequestId = null;
      } else {
        ai = AI_IDLE; // any new data invalidates analysis based on the old version
      }

      if (addPending) {
        addPending = false;
        addOpen = false;
        addDirty = false;
        queueMicrotask(() => focusButton(refs.addButton));
        setStatus('Cost item added — the mock host acknowledged the change (benchmark data).');
      } else if (editPending) {
        editPending = false;
        editDraft = null;
        queueMicrotask(() => focusInner(refs.detail.querySelector('#cc-edit') as HTMLElement, '[part="control"]'));
        setStatus('Changes saved — the mock host acknowledged the update.');
      } else if (applied) {
        setStatus('Suggestion applied — costs updated after the mock host acknowledgment.');
      } else {
        setStatus(`Loaded ${payload.rows.length} cost lines for ${payload.project} (benchmark fixture data).`);
      }
      persist();
      render(true);
    }

    function onMessage(event: MessageEvent): void {
      const message = event.data as CostControlHostMessage | undefined;
      if (!isRecord(message) || typeof message.type !== 'string' || !message.type.startsWith('cost-control/')) return;
      switch (message.type) {
        case 'cost-control/loading': {
          if (isStaleDataAnswer(message.requestId)) return;
          view = 'loading';
          data = null;
          statusMessage = '';
          setStatus('Loading costs…');
          break;
        }
        case 'cost-control/projects': {
          if (!isProjectsPayload(message.payload)) return;
          projects = message.payload.projects;
          projectKey = null; // force selector rebuild
          setStatus(`Project registry loaded: ${projects.length} projects (benchmark data).`);
          break;
        }
        case 'cost-control/data': {
          if (isStaleDataAnswer(message.requestId)) return;
          if (!isDataPayload(message.payload)) return; // malformed: never touch financial data
          applyData(message.payload, message.requestId);
          return;
        }
        case 'cost-control/empty': {
          if (isStaleDataAnswer(message.requestId)) return;
          if (!isMessagePayload(message.payload)) return;
          view = 'empty';
          data = null;
          statusMessage = message.payload.message;
          expectedRequestId = null;
          setStatus(message.payload.message);
          break;
        }
        case 'cost-control/error': {
          if (isStaleDataAnswer(message.requestId)) return;
          if (!isMessagePayload(message.payload)) return;
          expectedRequestId = null;
          if (message.requestId !== undefined && (addPending || editPending)) {
            // Correlated mutation failure: keep the workspace and the form
            // values, report inline. (Uncorrelated errors take the full view.)
            if (addPending) {
              addPending = false;
              showAddError(message.payload.message);
            } else {
              editPending = false;
              showEditError(message.payload.message);
            }
            setStatus(message.payload.message);
            render(true);
            return;
          }
          if (applyRequestId !== null && message.requestId === applyRequestId) {
            // The accepted suggestion failed to apply: costs unchanged.
            applyRequestId = null;
            ai = aiReduce(ai, { type: 'failure', requestId: message.requestId, message: message.payload.message });
            setStatus(message.payload.message);
            render(true);
            return;
          }
          view = 'error';
          data = null;
          statusMessage = message.payload.message;
          setStatus(message.payload.message);
          break;
        }
        case 'cost-control/permission-denied': {
          if (!isMessagePayload(message.payload)) return;
          view = 'permission-denied';
          data = null;
          statusMessage = message.payload.message;
          setStatus(message.payload.message);
          break;
        }
        case 'cost-control/analysis': {
          if (!isAnalysisPayload(message.payload)) return; // malformed: ignore
          const source = data?.rows.find((row) => row.id === message.payload.suggestion.itemId);
          if (!data || message.payload.projectId !== data.projectId || !source || source.cost !== message.payload.suggestion.before || !message.payload.sourceItemIds.includes(source.id)) return;
          const before = ai;
          ai = aiReduce(ai, { type: 'proposal', requestId: message.requestId, proposal: message.payload });
          if (ai === before) return; // stale (cancelled, superseded, replayed): ignore silently
          setStatus('Mock analysis ready — review the proposal in the AI review section.');
          break;
        }
        case 'cost-control/analysis-error': {
          if (!isMessagePayload(message.payload)) return;
          const before = ai;
          ai = aiReduce(ai, { type: 'failure', requestId: message.requestId, message: message.payload.message });
          if (ai === before) return; // stale
          setStatus(message.payload.message);
          break;
        }
        default:
          return; // unknown message in the family: ignore, never guess
      }
      render();
    }

    // ---- requests ------------------------------------------------------------
    function requestData(type: 'cost-control/refresh' | 'cost-control/retry'): void {
      const requestId = nextRequestId();
      expectedRequestId = requestId;
      const projectId = currentProjectId();
      ai = AI_IDLE;
      applyRequestId = null;
      view = 'loading';
      statusMessage = '';
      api.postMessage({ type, payload: { requestId, projectId } });
      render();
    }

    function startAnalysis(): void {
      if (!data || !canAnalyze() || addPending || editPending || ai.phase === 'applying') return;
      refs.tabs.setAttribute('active', 'section-ai');
      const requestId = nextRequestId();
      ai = aiReduce(ai, { type: 'start', requestId });
      setStatus('Analysis pending — waiting for the deterministic mock host…');
      api.postMessage({ type: 'cost-control/analyze', payload: { requestId, projectId: currentProjectId() } });
      render(true);
    }

    function cancelAnalysis(): void {
      if (ai.phase === 'pending' && ai.requestId !== null) {
        api.postMessage({ type: 'cost-control/cancel-analysis', payload: { requestId: ai.requestId } });
      }
      ai = aiReduce(ai, { type: 'cancel' });
      setStatus('Analysis cancelled — a late answer for this request will be ignored.');
      render(true);
    }

    // ---- toolbar wiring --------------------------------------------------------
    refs.refreshButton.addEventListener('obra-activate', () => {
      const refresh = (): void => {
        editDraft = null;
        addOpen = false;
        addDirty = false;
        requestData('cost-control/refresh');
        setStatus('Refreshing costs…');
      };
      if (editDraft?.dirty || addDirty) askConfirm({ heading: 'Discard pending changes?', message: 'Refreshing discards unsaved form changes.', confirmLabel: 'Discard and refresh', danger: true }, refresh);
      else refresh();
    });
    refs.table.addEventListener('obra-retry', () => {
      view = 'loading';
      statusMessage = '';
      requestData('cost-control/retry');
      setStatus('Retrying…');
      render(true);
    });
    refs.addButton.addEventListener('obra-activate', () => {
      if (addOpen) { focusInner(refs.addNameInput, 'input'); return; }
      addOpen = true;
      if (addOpen) {
        clearAddErrors();
        refs.addNameInput.setAttribute('value', '');
        refs.addCostInput.setAttribute('value', '');
        addDirty = false;
        setStatus('Add cost item form open — benchmark data only.');
      } else {
        focusButton(refs.addButton);
      }
      render();
      if (addOpen) focusInner(refs.addNameInput, 'input');
    });
    refs.cancelAnalysisButton.addEventListener('obra-activate', cancelAnalysis);
    refs.analyzeButton.addEventListener('obra-activate', startAnalysis);

    refs.projectSelect.addEventListener('obra-change', (event) => {
      const projectId = (event as CustomEvent<{ value: string }>).detail.value;
      if (!projectId || projectId === currentProjectId()) return;
      const switchTo = (): void => {
        const requestId = nextRequestId();
        expectedRequestId = requestId;
        activeProjectId = projectId;
        applyRequestId = null;
        if (ai.phase !== 'idle') {
          ai = aiReduce(ai, { type: 'reset' });
          setStatus('Analysis abandoned — the project changed.');
        }
        view = 'loading';
        data = null;
        selectedId = null;
        editDraft = null;
        editPending = false;
        addOpen = false;
        addPending = false;
        statusMessage = '';
        api.postMessage({ type: 'cost-control/select-project', payload: { requestId, projectId } });
        if (ai.phase === 'idle') setStatus('Loading costs…');
        persist();
        render(true);
      };
      if (editDraft?.dirty || addDirty) {
        askConfirm(
          {
            heading: 'Discard pending changes?',
            message: 'Switching projects now discards the unsaved form changes. Costs on the host stay unchanged.',
            confirmLabel: 'Discard and switch',
            danger: true,
          },
          switchTo,
          () => setSelectValue(refs.projectSelect, currentProjectId()),
        );
        return;
      }
      // An open (clean) edit or add form is closed explicitly, not silently.
      if (editDraft || addOpen) {
        editDraft = null;
        addOpen = false;
      }
      switchTo();
    });

    // ---- filters -----------------------------------------------------------------
    refs.searchField.addEventListener('obra-input', (event) => {
      filters = { ...filters, search: (event as CustomEvent<{ value: string }>).detail.value };
      // Keystroke path: only the table + count re-render; the search field
      // itself is untouched, so focus and caret survive.
      syncTable();
    });
    refs.categorySelect.addEventListener('obra-change', (event) => {
      filters = { ...filters, category: (event as CustomEvent<{ value: string }>).detail.value };
      render();
    });
    refs.statusSelect.addEventListener('obra-change', (event) => {
      filters = { ...filters, status: (event as CustomEvent<{ value: string }>).detail.value };
      render();
    });
    refs.clearFiltersButton.addEventListener('obra-activate', () => {
      filters = NO_FILTERS;
      refs.searchField.setAttribute('value', '');
      setSelectValue(refs.categorySelect, ALL);
      setSelectValue(refs.statusSelect, ALL);
      setStatus('Filters cleared.');
      render(true);
      focusInner(refs.searchField, 'input');
    });

    // ---- add form ------------------------------------------------------------------
    function showAddError(message: string): void {
      refs.addError.textContent = message;
      refs.addError.removeAttribute('hidden');
    }
    function clearAddErrors(): void {
      refs.addError.textContent = '';
      refs.addError.setAttribute('hidden', '');
      refs.addNameField.removeAttribute('error');
      refs.addCostField.removeAttribute('error');
      refs.addNameInput.removeAttribute('invalid');
      refs.addCostInput.removeAttribute('invalid');
    }
    function closeAddForm(): void {
      addOpen = false;
      addPending = false;
      addDirty = false;
      render();
      focusButton(refs.addButton);
    }
    for (const input of [refs.addNameInput, refs.addCostInput, refs.addCategorySelect, refs.addStatusSelect]) {
      input.addEventListener('obra-input', () => { addDirty = true; });
      input.addEventListener('obra-change', () => { addDirty = true; });
    }
    refs.addCancelButton.addEventListener('obra-activate', closeAddForm);
    refs.addSaveButton.addEventListener('obra-activate', () => {
      if (!data || addPending || !canEdit()) return;
      clearAddErrors();
      const name = refs.addNameInput.value;
      const costText = refs.addCostInput.value;
      const nameError = validateItemName(name);
      const cost = parseMoney(costText);
      if (nameError) {
        refs.addNameField.setAttribute('error', nameError);
        refs.addNameInput.setAttribute('invalid', '');
      }
      if (!cost.ok) {
        refs.addCostField.setAttribute('error', cost.error);
        refs.addCostInput.setAttribute('invalid', '');
      }
      if (nameError) {
        focusInner(refs.addNameInput, 'input');
        return;
      }
      if (!cost.ok) {
        focusInner(refs.addCostInput, 'input');
        return;
      }
      const category = refs.addCategorySelect.value || DEFAULT_CATEGORIES[0];
      const statusValue = (COST_ITEM_STATUSES as readonly string[]).includes(refs.addStatusSelect.value)
        ? (refs.addStatusSelect.value as CostItemStatus)
        : 'pending';
      const requestId = nextRequestId();
      expectedRequestId = requestId;
      addPending = true;
      refs.addSaveButton.setAttribute('loading', '');
      setStatus('Saving new cost item…');
      api.postMessage({
        type: 'cost-control/add-item',
        payload: { requestId, projectId: data.projectId, item: { name: name.trim(), category, status: statusValue, cost: cost.value } },
      });
      render(true);
    });

    // ---- table --------------------------------------------------------------------
    refs.table.addEventListener('obra-row-select', (event) => {
      const detail = (event as CustomEvent<{ row: Record<string, unknown> }>).detail;
      const id = String(detail.row.id);
      if (id === selectedId) return;
      if (editPending || addPending || ai.phase === 'applying') {
        const previous = visibleRows().findIndex((row) => row.id === selectedId);
        if (previous >= 0) refs.table.selectRow(previous);
        return;
      }
      const applySelection = (): void => {
        selectedId = id;
        persist();
        render(true);
      };
      if (editDraft?.dirty) {
        const previousId = selectedId;
        askConfirm(
          {
            heading: 'Discard pending changes?',
            message: 'This line item has unsaved edits. Selecting another line discards them.',
            confirmLabel: 'Discard changes',
            danger: true,
          },
          () => {
            editDraft = null;
            editPending = false;
            applySelection();
          },
          () => {
            // Cancel keeps the edit and restores the previous selection —
            // nothing is dropped silently (ux/cost-control.yaml).
            selectedId = previousId;
            restoreTableHighlight();
            render(true);
          },
        );
        return;
      }
      if (editDraft) editDraft = null; // clean (untouched) edit form: closing is safe
      applySelection();
    });
    refs.table.addEventListener('obra-row-activate', () => {
      if (selectedId !== null) {
        api.postMessage({ type: 'cost-control/select', payload: { id: selectedId } });
        refs.detail.focus();
      }
    });

    /** Re-render rows and re-select the current row (focus + highlight). */
    function restoreTableHighlight(): void {
      tableKey = null;
      syncTable();
      if (!data || selectedId === null) return;
      const index = visibleRows().findIndex((row) => row.id === selectedId);
      if (index < 0) return;
      refs.table.selectRow(index, true);
    }

    function visibleRows(): readonly CostRow[] {
      return data ? filterRows(data.rows, filters) : [];
    }

    // ---- detail pane ----------------------------------------------------------------
    function showEditError(message: string): void {
      // Stored in state, not written into the DOM directly: the detail pane
      // re-renders (editPending changed), and the rebuilt form must still
      // show the host's rejection.
      editError = message;
      editPending = false;
    }

    function buildReadonlyDetail(row: CostRow): HTMLElement[] {
      const currency = data?.currency ?? 'USD';
      const nodes: HTMLElement[] = [
        el('obra-property-row', { label: 'Line item', value: row.name }),
        el('obra-property-row', { label: 'ID', value: row.id }),
        el('obra-property-row', { label: 'Category', value: row.category }),
        el('obra-property-row', { label: 'Status', value: row.status }),
        el('obra-property-row', { label: 'Amount', value: formatMoney(row.cost, currency) }),
      ];
      if (canEdit()) {
        const editButton = el('obra-button', { id: 'cc-edit', variant: 'secondary' }, 'Edit item');
        editButton.toggleAttribute('disabled', addOpen || addPending || ai.phase === 'pending' || ai.phase === 'proposal' || ai.phase === 'applying');
        editButton.addEventListener('obra-activate', () => {
          editDraft = { id: row.id, name: row.name, category: row.category, status: row.status, costText: String(row.cost), dirty: false };
          render(true);
          focusInner(refs.detail.querySelector('#cc-edit-name') as HTMLElement, 'input');
        });
        nodes.push(el('obra-stack', { gap: 'sm' }, editButton));
      } else {
        nodes.push(el('p', { class: 'obra-cost-control__hint' }, 'Editing is disabled: the obra.cost.write scope is missing for this project.'));
      }
      return nodes;
    }

    function buildEditDetail(draft: EditDraft): HTMLElement[] {
      const row = data?.rows.find((candidate) => candidate.id === draft.id);
      const currency = data?.currency ?? 'USD';
      if (!row) return [el('p', { class: 'obra-cost-control__hint' }, 'This line item no longer exists.')];

      const nameInput = el('obra-text-field', { id: 'cc-edit-name', value: draft.name }) as ObraTextField;
      const nameField = el('obra-form-field', { label: 'Line item name', required: '' }, nameInput);
      labelInnerControl(nameInput, 'Line item name');
      const categorySelect = el('obra-select', { id: 'cc-edit-category' }) as ObraSelect;
      const categories = data ? distinctCategories(data.rows) : DEFAULT_CATEGORIES;
      setSelectOptions(categorySelect, [...new Set([...categories, draft.category])].map((c) => ({ value: c, label: c })));
      setSelectValue(categorySelect, draft.category);
      labelInnerControl(categorySelect, 'Category');
      const categoryField = el('obra-form-field', { label: 'Category' }, categorySelect);
      const statusSelect = el('obra-select', { id: 'cc-edit-status' }) as ObraSelect;
      setSelectOptions(statusSelect, COST_ITEM_STATUSES.map((s) => ({ value: s, label: s })));
      setSelectValue(statusSelect, draft.status);
      labelInnerControl(statusSelect, 'Status');
      const statusField = el('obra-form-field', { label: 'Status' }, statusSelect);
      const costInput = el('obra-text-field', { id: 'cc-edit-cost', value: draft.costText }) as ObraTextField;
      const costField = el('obra-form-field', { label: `Amount (${currency})`, hint: 'Plain positive amount, at most two decimals.' }, costInput);
      labelInnerControl(costInput, 'Amount');
      const errorSlot = el('p', { id: 'cc-edit-error', role: 'alert', class: 'obra-cost-control__error' });
      if (editError) errorSlot.textContent = editError;
      else errorSlot.setAttribute('hidden', '');

      const track = (field: HTMLElement, input: HTMLElement, apply: () => void): void => {
        const handler = (): void => {
          draft.dirty = true;
          apply();
          editError = '';
          field.removeAttribute('error');
          input.removeAttribute('invalid');
          errorSlot.textContent = '';
          errorSlot.setAttribute('hidden', '');
        };
        input.addEventListener('obra-input', handler);
        input.addEventListener('obra-change', handler);
      };
      track(nameField, nameInput, () => { draft.name = nameInput.value; });
      track(costField, costInput, () => { draft.costText = costInput.value; });
      categorySelect.addEventListener('obra-change', (event) => {
        draft.dirty = true;
        draft.category = (event as CustomEvent<{ value: string }>).detail.value;
      });
      statusSelect.addEventListener('obra-change', (event) => {
        draft.dirty = true;
        draft.status = (event as CustomEvent<{ value: string }>).detail.value as CostItemStatus;
      });

      const saveButton = el('obra-button', { id: 'cc-edit-save' }, 'Save changes');
      const cancelButton = el('obra-button', { id: 'cc-edit-cancel', variant: 'secondary' }, 'Cancel');
      saveButton.addEventListener('obra-activate', () => {
        if (!data || editPending || !canEdit()) return;
        editError = '';
        errorSlot.textContent = '';
        errorSlot.setAttribute('hidden', '');
        nameField.removeAttribute('error');
        costField.removeAttribute('error');
        nameInput.removeAttribute('invalid');
        costInput.removeAttribute('invalid');
        const nameError = validateItemName(draft.name);
        const cost = parseMoney(draft.costText);
        if (nameError) {
          nameField.setAttribute('error', nameError);
          nameInput.setAttribute('invalid', '');
        }
        if (!cost.ok) {
          costField.setAttribute('error', cost.error);
          costInput.setAttribute('invalid', '');
        }
        if (nameError) {
          focusInner(nameInput, 'input');
          return;
        }
        if (!cost.ok) {
          focusInner(costInput, 'input');
          return;
        }
        const requestId = nextRequestId();
        expectedRequestId = requestId;
        editPending = true;
        saveButton.setAttribute('loading', '');
        setStatus('Saving changes…');
        api.postMessage({
          type: 'cost-control/update-item',
          payload: {
            requestId,
            projectId: data.projectId,
            id: draft.id,
            patch: { name: draft.name.trim(), category: draft.category, status: draft.status, cost: cost.value },
          },
        });
        render(true);
      });
      for (const control of [nameInput, categorySelect, statusSelect, costInput, saveButton, cancelButton]) control.toggleAttribute('disabled', editPending);
      saveButton.toggleAttribute('loading', editPending);
      cancelButton.addEventListener('obra-activate', () => {
        editDraft = null;
        editPending = false;
        editError = '';
        render(true);
        focusInner(refs.detail.querySelector('#cc-edit') as HTMLElement, '[part="control"]');
      });

      return [
        el('h3', { class: 'obra-cost-control__form-title' }, `Edit ${row.id}`),
        nameField,
        categoryField,
        statusField,
        costField,
        errorSlot,
        el('obra-stack', { gap: 'sm' }, saveButton, cancelButton),
      ];
    }

    // ---- pane renderers ---------------------------------------------------------------
    function syncTable(): void {
      const key = [dataVersion, view, filters.search, filters.category, filters.status].join('|');
      if (key === tableKey) return;
      tableKey = key;
      const table = refs.table;
      if (view === 'ready' && data) {
        const payload = data;
        const rows = visibleRows().map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          status: row.status,
          // Display string for the cell; the raw amount stays in costValue.
          cost: formatMoney(row.cost, payload.currency),
          costValue: row.cost,
        }));
        if (rows.length === 0) {
          table.setAttribute('empty-message', 'No cost lines match the current filters.');
        }
        table.setData(COLUMNS, rows, 'ready');
        const selected = rows.findIndex((row) => row.id === selectedId);
        if (selected >= 0) table.selectRow(selected);
        refs.resultCount.textContent = `Showing ${rows.length} of ${payload.rows.length} cost lines.`;
      } else if (view === 'empty') {
        table.setAttribute('empty-message', statusMessage || 'Nothing here yet');
        table.setData(COLUMNS, [], 'empty');
        refs.resultCount.textContent = data ? `Showing 0 of ${data.rows.length} cost lines.` : 'No cost data.';
      } else if (view === 'error') {
        table.setAttribute('error-message', statusMessage);
        table.setData(COLUMNS, [], 'error');
        refs.resultCount.textContent = '';
      } else if (view === 'permission-denied') {
        // No table-level retry: retrying cannot grant a missing scope.
        table.setAttribute('empty-message', `Access denied — ${statusMessage}`);
        table.setData(COLUMNS, [], 'empty');
        refs.resultCount.textContent = '';
      } else {
        table.setData(COLUMNS, [], 'loading');
        refs.resultCount.textContent = '';
      }
      refs.countBadge.textContent = data ? String(data.rows.length) : '0';
    }

    function syncDetail(force: boolean): void {
      const key = [
        dataVersion,
        view,
        selectedId,
        editDraft ? `edit:${editDraft.id}:${editPending ? 'pending' : 'open'}` : 'read',
        canEdit(), addOpen, addPending, ai.phase,
      ].join('|');
      if (!force && key === detailKey) return;
      detailKey = key;

      const children: Array<Node | string> = [];
      if (view === 'error' || view === 'permission-denied') {
        const errorState = el('obra-error-state', {
          message: view === 'permission-denied' ? statusMessage : statusMessage || HINTS.error,
        });
        if (view === 'error') {
          const retry = el('obra-button', { slot: 'actions', variant: 'secondary' }, 'Retry');
          retry.addEventListener('click', () => {
            view = 'loading';
            statusMessage = '';
            requestData('cost-control/retry');
            setStatus('Retrying…');
            render(true);
          });
          errorState.append(retry);
        }
        children.push(errorState);
      } else if ((view === 'ready' || view === 'empty') && editDraft) {
        children.push(...buildEditDetail(editDraft));
      } else if (view === 'ready') {
        const row = selectedRow();
        if (row) children.push(...buildReadonlyDetail(row));
        else children.push(el('p', { class: 'obra-cost-control__hint' }, HINTS.ready));
      } else {
        children.push(el('p', { class: 'obra-cost-control__hint' }, HINTS[view]));
      }
      refs.detail.replaceChildren(...children);
    }

    function syncSummary(): void {
      const key = [dataVersion, view].join('|');
      if (key === summaryKey) return;
      summaryKey = key;
      const children: Array<Node | string> = [];
      if (view === 'ready' && data) {
        // Const capture: closures below must keep the non-null narrowing of
        // the mutable `data` binding.
        const payload = data;
        const pct = payload.budgetTotal > 0 ? Math.round((payload.budgetUsed / payload.budgetTotal) * 100) : 0;
        children.push(
          el(
            'div',
            { class: 'obra-cost-control__meter' },
            el(
              'span',
              { class: 'obra-cost-control__meter-label' },
              `Budget used — ${formatMoney(payload.budgetUsed, payload.currency)} of ${formatMoney(payload.budgetTotal, payload.currency)} (${pct}%)`,
            ),
            el('obra-progress', { value: String(pct), 'aria-label': 'Budget used', 'aria-valuetext': `${formatMoney(payload.budgetUsed, payload.currency)} of ${formatMoney(payload.budgetTotal, payload.currency)}` }),
          ),
          el('obra-property-row', { label: 'Project', value: payload.project }),
          el('obra-property-row', { label: 'Currency', value: payload.currency }),
          el('obra-property-row', { label: 'Cost lines', value: String(payload.rows.length) }),
          el('obra-section-header', {}, 'Totals by category'),
          ...categoryTotals(payload.rows).map((total) =>
            el('obra-property-row', {
              label: total.category,
              value: `${formatMoney(total.total, payload.currency)} · ${total.count} ${total.count === 1 ? 'line' : 'lines'}`,
            }),
          ),
        );
      } else {
        children.push(el('p', { class: 'obra-cost-control__hint' }, HINTS[view]));
      }
      refs.summary.replaceChildren(...children);
    }

    function syncAi(): void {
      const key = [ai.phase, ai.requestId, ai.proposal?.analysisId ?? '', ai.error ?? '', dataVersion, view, canAnalyze()].join('|');
      if (key === aiKey) return;
      aiKey = key;
      const children: Array<Node | string> = [];
      const mockNote = el(
        'p',
        { class: 'obra-cost-control__hint' },
        'Benchmark only: "Analyze costs" asks the deterministic fixture host (mock) for one savings suggestion. No real AI, no network, no secrets.',
      );

      if (view !== 'ready' || !data) {
        children.push(el('p', { class: 'obra-cost-control__hint' }, 'AI review is available once cost data has loaded.'));
      } else if (!canAnalyze()) {
        children.push(
          el('p', { class: 'obra-cost-control__hint' }, 'AI review is disabled: the obra.cost.analyze scope is missing for this project. Retrying cannot grant it.'),
        );
      } else if (ai.phase === 'pending') {
        const cancel = el('obra-button', { id: 'cc-ai-cancel', variant: 'secondary' }, 'Cancel analysis');
        cancel.addEventListener('obra-activate', cancelAnalysis);
        children.push(el('obra-loading-state', { label: 'Analyzing costs (deterministic mock responder)…' }), el('obra-stack', { gap: 'sm' }, cancel));
      } else if (ai.phase === 'proposal' && ai.proposal) {
        children.push(...buildProposal(ai.proposal));
      } else if (ai.phase === 'applying') {
        children.push(el('obra-loading-state', { label: 'Applying the accepted suggestion…' }));
      } else if (ai.phase === 'error') {
        const errorState = el('obra-error-state', { message: ai.error ?? 'The mock analysis failed.' });
        const retry = el('obra-button', { slot: 'actions', variant: 'secondary', id: 'cc-ai-retry' }, 'Retry analysis');
        retry.addEventListener('click', startAnalysis);
        errorState.append(retry);
        children.push(errorState);
      } else {
        children.push(mockNote);
      }
      refs.ai.replaceChildren(...children);
    }

    function buildProposal(proposal: CostAnalysisPayload): HTMLElement[] {
      const impact = proposal.budgetImpact;
      const accept = el('obra-button', { id: 'cc-ai-accept' }, 'Accept suggestion');
      accept.addEventListener('obra-activate', () => {
        askConfirm(
          {
            heading: 'Apply the mocked suggestion?',
            message:
              `This changes "${proposal.suggestion.itemName}" from ` +
              `${formatMoney(proposal.suggestion.before, impact.currency)} to ${formatMoney(proposal.suggestion.after, impact.currency)}. ` +
              'Costs change only after you confirm here AND the mock host acknowledges with fresh data.',
            confirmLabel: 'Apply change',
            danger: true,
          },
          () => {
            const requestId = nextRequestId();
            expectedRequestId = requestId;
            applyRequestId = requestId;
            // The apply exchange continues under the NEW requestId, so the
            // correlated data/error answers match the ai state machine.
            ai = { ...aiReduce(ai, { type: 'accept', requestId }), requestId };
            setStatus('Applying accepted suggestion — waiting for the mock host acknowledgment…');
            api.postMessage({
              type: 'cost-control/apply-analysis',
              payload: { requestId, analysisId: proposal.analysisId, projectId: proposal.projectId },
            });
            render(true);
          },
        );
      });
      const reject = el('obra-button', { id: 'cc-ai-reject', variant: 'secondary' }, 'Reject');
      reject.addEventListener('obra-activate', () => {
        ai = aiReduce(ai, { type: 'reject' });
        setStatus('Suggestion rejected — costs unchanged.');
        render(true);
      });
      return [
        el('obra-badge', {}, 'Mocked benchmark output — not real AI'),
        el('obra-property-row', { label: 'Analysis', value: proposal.analysisId }),
        el('obra-property-row', { label: 'Source item(s)', value: proposal.sourceItemIds.join(', ') }),
        el('obra-property-row', { label: 'Item', value: `${proposal.suggestion.itemId} — ${proposal.suggestion.itemName}` }),
        el('obra-property-row', { label: 'Before', value: formatMoney(proposal.suggestion.before, impact.currency) }),
        el('obra-property-row', { label: 'After', value: formatMoney(proposal.suggestion.after, impact.currency) }),
        el('obra-property-row', {
          label: 'Budget impact',
          value: `${formatMoney(impact.usedBefore, impact.currency)} → ${formatMoney(impact.usedAfter, impact.currency)} of ${formatMoney(impact.total, impact.currency)}`,
        }),
        el('p', { class: 'obra-cost-control__full-value' }, proposal.rationale),
        el('obra-stack', { gap: 'sm' }, accept, reject),
      ];
    }

    function syncChrome(): void {
      refs.root.dataset.state = view;

      // Banner: textual permission notes (never color-only).
      if (view === 'permission-denied') {
        refs.banner.textContent = `Access denied — ${statusMessage}`;
        refs.banner.removeAttribute('hidden');
      } else if (view === 'ready' && data && (!canEdit() || !canAnalyze())) {
        const missing = [!canEdit() ? 'obra.cost.write' : null, !canAnalyze() ? 'obra.cost.analyze' : null].filter(Boolean).join(' and ');
        refs.banner.textContent = `Read-only: this account lacks the ${missing} scope for ${data.project}. Actions that change data are disabled.`;
        refs.banner.removeAttribute('hidden');
      } else {
        refs.banner.textContent = '';
        refs.banner.setAttribute('hidden', '');
      }

      const interactive = view === 'ready' || (view === 'empty' && data !== null);
      const busy = addPending || editPending || ai.phase === 'applying';
      toggleDisabled(refs.projectSelect, busy);
      toggleDisabled(refs.refreshButton, view === 'loading' || view === 'permission-denied' || busy);
      toggleDisabled(refs.addButton, !interactive || !canEdit() || busy || editDraft !== null || ai.phase === 'pending' || ai.phase === 'proposal');
      toggleDisabled(refs.analyzeButton, !interactive || !canAnalyze() || ai.phase === 'pending' || busy || addOpen || editDraft !== null);
      refs.analyzeButton.toggleAttribute('loading', ai.phase === 'pending' || ai.phase === 'applying');
      refs.cancelAnalysisButton.toggleAttribute('hidden', ai.phase !== 'pending');
      refs.refreshButton.toggleAttribute('loading', view === 'ready' && expectedRequestId !== null && !addPending && !editPending && applyRequestId === null);
      toggleDisabled(refs.clearFiltersButton, view !== 'ready');
      toggleDisabled(refs.addSaveButton, addPending);
      toggleDisabled(refs.addCancelButton, addPending);
      refs.addForm.toggleAttribute('hidden', !addOpen || !interactive);
      for (const input of [refs.addNameInput, refs.addCostInput, refs.addCategorySelect, refs.addStatusSelect]) input.toggleAttribute('disabled', addPending);
      refs.addSaveButton.toggleAttribute('loading', addPending);
    }

    function toggleDisabled(button: HTMLElement, disabled: boolean): void {
      button.toggleAttribute('disabled', disabled);
    }

    function syncProjectOptions(): void {
      const key = [projects.map((project) => project.id).join(','), currentProjectId()].join('|');
      if (key === projectKey) return;
      projectKey = key;
      const options = (projects.length > 0 ? projects : data ? [{ id: data.projectId, name: data.project }] : []).map(
        (project) => ({ value: project.id, label: project.name }),
      );
      if (options.length > 0) {
        setSelectOptions(refs.projectSelect, options);
        setSelectValue(refs.projectSelect, currentProjectId());
      }
      toggleDisabled(refs.projectSelect, options.length <= 1 || addPending || editPending || ai.phase === 'applying');
    }

    function syncFilterOptions(): void {
      const key = String(dataVersion);
      if (key === filterOptionsKey) return;
      filterOptionsKey = key;
      if (!data) return;
      const categories = distinctCategories(data.rows);
      const statuses = distinctStatuses(data.rows);
      const keepCategory = categories.includes(filters.category) ? filters.category : ALL;
      const keepStatus = (statuses as readonly string[]).includes(filters.status) ? filters.status : ALL;
      setSelectOptions(refs.categorySelect, [{ value: ALL, label: 'All categories' }, ...categories.map((c) => ({ value: c, label: c }))]);
      setSelectValue(refs.categorySelect, keepCategory);
      setSelectOptions(refs.statusSelect, [{ value: ALL, label: 'All statuses' }, ...statuses.map((s) => ({ value: s, label: s }))]);
      setSelectValue(refs.statusSelect, keepStatus);
      if (keepCategory !== filters.category || keepStatus !== filters.status) {
        filters = { ...filters, category: keepCategory, status: keepStatus };
        tableKey = null;
      }
      // Add-form + edit-form category options follow the data.
      setSelectOptions(refs.addCategorySelect, (categories.length > 0 ? categories : DEFAULT_CATEGORIES).map((c) => ({ value: c, label: c })));
      setSelectValue(refs.addCategorySelect, categories[0] ?? DEFAULT_CATEGORIES[0]);
      setSelectOptions(refs.addStatusSelect, COST_ITEM_STATUSES.map((s) => ({ value: s, label: s })));
      setSelectValue(refs.addStatusSelect, 'pending');
    }

    function render(force = false): void {
      syncChrome();
      syncProjectOptions();
      syncFilterOptions();
      syncTable();
      syncDetail(force);
      syncSummary();
      syncAi();
    }

    // ---- sections + escape -----------------------------------------------------------
    refs.tabs.setAttribute('active', sectionTabId(section));
    refs.tabs.addEventListener('obra-change', (event) => {
      const active = (event as CustomEvent<{ active: string }>).detail.active;
      const next = active.replace(/^section-/, '');
      if (isSectionId(next) && next !== section) {
        section = next;
        persist();
      }
    });

    function onKeydown(event: KeyboardEvent): void {
      if (event.key !== 'Escape') return;
      if (refs.confirmDialog.hasAttribute('open')) return; // native dialog handles Escape
      if (addOpen && !addPending) {
        event.preventDefault();
        closeAddForm();
        return;
      }
      if (editDraft && !editPending) {
        event.preventDefault();
        editDraft = null;
        render(true);
        focusInner(refs.detail.querySelector('#cc-edit') as HTMLElement, '[part="control"]');
        setStatus('Edit cancelled — changes discarded, costs unchanged.');
      }
    }

    // ---- mount -------------------------------------------------------------------------
    window.addEventListener('message', onMessage);
    refs.root.addEventListener('keydown', onKeydown);
    root.replaceChildren(refs.root);
    render(true);

    return () => {
      window.removeEventListener('message', onMessage);
      refs.root.removeEventListener('keydown', onKeydown);
      root.replaceChildren();
    };
  },
};
