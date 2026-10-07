/**
 * Sample surface: cost-control.
 *
 * Built ONLY from `@obra/ui` components (Principle 3) over `--obra-*` tokens
 * (Principles 4, 5) — the only plain elements here are the layout divs and
 * text labels styled by `src/harness.css` with token values. It renders every
 * fixture state required by Principle 8: loading, empty, error,
 * permission-denied, ready, and extreme content (1000 rows).
 *
 * The `.obra-cost-control` class is the stable surface id selector that
 * `scripts/ui/flows/cost-control.mjs` waits for in the real Code OSS host, so
 * the same flow can target harness and host markup.
 *
 * Phase 9 replaces this sample with the real product surface; until then this
 * module is the reference for how a surface consumes the fixture bridge:
 * `getState()` on mount, `postMessage()` out, `message` events in.
 */
import type { DataTableColumn, ObraDataTable } from '@obra/ui';
import type { CostControlDataPayload, CostControlHostMessage, CostControlPersistedState, CostRow } from '../../fixtures/protocol.js';
import { el } from '../dom.js';
import type { VsCodeApi } from '../vscode-api.js';
import type { HarnessSurface } from './types.js';

type ViewState = 'loading' | 'ready' | 'empty' | 'error' | 'permission-denied';

const COLUMNS: DataTableColumn[] = [
  { key: 'id', header: 'ID' },
  { key: 'name', header: 'Line item' },
  { key: 'category', header: 'Category' },
  { key: 'cost', header: 'Cost', align: 'end' },
];

const HINTS: Record<ViewState, string> = {
  loading: 'Waiting for the cost service to respond…',
  ready: 'Select a line item to inspect it. Refresh re-requests the latest data.',
  empty: 'Costs appear here as soon as they are recorded.',
  error: 'The cost service failed. Retry re-sends the request.',
  'permission-denied': 'Access is controlled by the obra.cost.read scope.',
};

/** Deterministic currency formatting — no `Intl`, no locale-dependent output. */
function formatMoney(amount: number, currency: string): string {
  const grouped = String(Math.trunc(amount)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${currency} ${grouped}`;
}

export const costControlSurface: HarnessSurface = {
  id: 'cost-control',

  mount(root: HTMLElement, api: VsCodeApi): () => void {
    const persisted = api.getState() as CostControlPersistedState | undefined;

    let view: ViewState = 'loading';
    let data: CostControlDataPayload | null = null;
    let statusMessage = '';
    let selectedId: string | null = persisted?.selectedId ?? null;
    let detailEl!: HTMLElement;

    // Announce readiness; the host answers with the fixture's messages.
    api.postMessage({ type: 'cost-control/ready' });

    function onMessage(event: MessageEvent): void {
      const message = event.data as CostControlHostMessage | undefined;
      if (!message || typeof message.type !== 'string' || !message.type.startsWith('cost-control/')) return;
      switch (message.type) {
        case 'cost-control/loading':
          view = 'loading'; data = null; statusMessage = '';
          break;
        case 'cost-control/data':
          view = 'ready'; data = message.payload; statusMessage = '';
          break;
        case 'cost-control/empty':
          view = 'empty'; data = null; statusMessage = message.payload.message;
          break;
        case 'cost-control/error':
          view = 'error'; data = null; statusMessage = message.payload.message;
          break;
        case 'cost-control/permission-denied':
          view = 'permission-denied'; data = null; statusMessage = message.payload.message;
          break;
        default:
          return; // unknown message in the family: ignore, never guess
      }
      render();
    }

    function renderDetail(): void {
      const children: Array<Node | string> = [];

      if (view === 'error' || view === 'permission-denied') {
        const errorState = el('obra-error-state', { message: statusMessage });
        if (view === 'error') {
          // Retry only where retrying can help — a missing scope cannot be
          // re-requested by the webview, so permission-denied offers none.
          const retry = el('obra-button', { slot: 'actions', variant: 'secondary' }, 'Retry');
          retry.addEventListener('click', () => api.postMessage({ type: 'cost-control/retry' }));
          errorState.append(retry);
        }
        children.push(errorState);
      } else if (data) {
        const selected: CostRow | undefined = data.rows.find((row) => row.id === selectedId);
        if (selected) {
          children.push(
            el('obra-property-row', { label: 'Line item', value: selected.name }),
            el('obra-property-row', { label: 'Category', value: selected.category }),
            el('obra-property-row', { label: 'Cost', value: formatMoney(selected.cost, data.currency) }),
            el('obra-property-row', { label: 'ID', value: selected.id }),
          );
        } else {
          children.push(el('p', { class: 'obra-cost-control__hint' }, 'Select a line item to inspect it.'));
        }
        const pct = data.budgetTotal > 0 ? Math.round((data.budgetUsed / data.budgetTotal) * 100) : 0;
        children.push(
          el(
            'div',
            { class: 'obra-cost-control__meter' },
            el(
              'span',
              { class: 'obra-cost-control__meter-label' },
              `Budget used — ${formatMoney(data.budgetUsed, data.currency)} of ${formatMoney(data.budgetTotal, data.currency)} (${pct}%)`,
            ),
            el('obra-progress', { value: String(pct) }),
          ),
        );
      } else {
        children.push(el('p', { class: 'obra-cost-control__hint' }, HINTS[view]));
      }

      detailEl.replaceChildren(...children);
    }

    function render(): void {
      const surface = el('div', { class: 'obra-cost-control', 'data-state': view });

      // Row 1: header with a live row count once data is in.
      const header = el('obra-section-header', {}, 'Cost Control');
      if (view === 'ready' && data) {
        header.append(el('obra-badge', { slot: 'actions' }, String(data.rows.length)));
      }

      // Row 2: toolbar with the refresh action and a state hint.
      const refreshAttrs: Record<string, string> = { variant: 'secondary', id: 'cc-refresh' };
      if (view === 'loading') refreshAttrs.disabled = '';
      const refresh = el('obra-button', refreshAttrs, 'Refresh');
      refresh.addEventListener('click', () => api.postMessage({ type: 'cost-control/refresh' }));
      const toolbar = el(
        'obra-toolbar',
        {},
        refresh,
        el('p', { slot: 'end', class: 'obra-cost-control__hint' }, HINTS[view]),
      );

      // Row 3: master-detail. The table carries loading/empty/error through
      // its own status; the detail pane explains the state and the budget.
      const table = el('obra-data-table') as ObraDataTable;
      table.addEventListener('obra-row-select', (event) => {
        const detail = (event as CustomEvent<{ row: Record<string, unknown> }>).detail;
        selectedId = String(detail.row.id);
        api.setState({ selectedId } satisfies CostControlPersistedState);
        renderDetail();
      });
      table.addEventListener('obra-row-activate', () => {
        if (selectedId !== null) {
          api.postMessage({ type: 'cost-control/select', payload: { id: selectedId } });
        }
      });
      table.addEventListener('obra-retry', () => api.postMessage({ type: 'cost-control/retry' }));

      if (view === 'ready' && data) {
        // `payload` is a const capture: the closure below keeps the non-null
        // narrowing that the mutable `data` binding would lose.
        const payload = data;
        const rows = payload.rows.map((row) => ({
          id: row.id,
          name: row.name,
          category: row.category,
          cost: formatMoney(row.cost, payload.currency),
        }));
        table.setData(COLUMNS, rows, 'ready');
      } else if (view === 'empty') {
        table.setAttribute('empty-message', statusMessage || 'Nothing here yet');
        table.setData(COLUMNS, [], 'empty');
      } else if (view === 'error' || view === 'permission-denied') {
        table.setAttribute('error-message', statusMessage);
        table.setData(COLUMNS, [], 'error');
      } else {
        table.setData(COLUMNS, [], 'loading');
      }

      const masterDetail = el('obra-master-detail', { ratio: '58%' });
      masterDetail.append(
        el('div', { slot: 'master', class: 'obra-cost-control__master' }, table),
      );
      detailEl = el('div', { class: 'obra-cost-control__detail' });
      masterDetail.append(detailEl);

      surface.append(header, toolbar, masterDetail);
      root.replaceChildren(surface);
      renderDetail();
    }

    window.addEventListener('message', onMessage);
    render();

    return () => {
      window.removeEventListener('message', onMessage);
      root.replaceChildren();
    };
  },
};
