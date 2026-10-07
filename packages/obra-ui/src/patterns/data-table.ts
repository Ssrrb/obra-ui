import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';

export interface DataTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'start' | 'end';
}
export type DataTableStatus = 'loading' | 'empty' | 'error' | 'ready';

/**
 * <obra-data-table> — token-themed table with the four required states and
 * keyboard navigation. Data is set via the `.columns` / `.rows` properties
 * (not attributes) so large datasets are cheap.
 *
 * Keyboard: ArrowUp/Down move selection, Home/End jump, Enter fires
 * obra-row-activate. role=grid with row/cell semantics. Extracted from the
 * toolkit data-grid behavior; reimplemented without FAST and without shipping
 * a virtualization dependency (host can page for very large sets).
 */
export class ObraDataTable extends ObraElement {
  static observedAttributes = ['status', 'error-message', 'empty-message'];

  columns: DataTableColumn[] = [];
  rows: Record<string, unknown>[] = [];
  private selected = -1;

  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; overflow: auto; overscroll-behavior: contain; }
      table { width: 100%; border-collapse: collapse; font-size: var(--obra-font-small); }
      th, td { text-align: start; padding: 0 var(--obra-data-table-cell-padding-x);
        height: var(--obra-data-table-row-height); white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis; max-width: 32ch; }
      thead th { position: sticky; top: 0; background: var(--obra-surface-raised);
        color: var(--obra-text-secondary); font-weight: var(--obra-font-weight-bold);
        border-bottom: var(--obra-border-width-default) solid var(--obra-data-table-border); }
      tbody tr { border-bottom: var(--obra-border-width-default) solid var(--obra-data-table-border); cursor: default; }
      @media (hover: hover) { tbody tr:hover { background: var(--obra-data-table-row-hover-background); } }
      tbody tr[aria-selected="true"] { background: var(--obra-data-table-row-selected-background);
        color: var(--obra-list-active-selection-foreground, var(--obra-text-primary)); }
      [part="control"]:focus-visible { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); }
      tbody tr:focus-visible { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); outline-offset: -2px; }
      td[align="end"], th[align="end"] { text-align: end; }`;
  }
  protected override template(): string {
    return `<div part="control" tabindex="0" role="region" aria-label="${this.escape(this.getAttribute('aria-label') ?? 'Data table')}"></div>`;
  }
  private get grid(): HTMLElement { return this.$('[part="control"]') as HTMLElement; }

  protected override onConnected(): void {
    this.grid.addEventListener('keydown', this.onKeyDown);
    this.grid.addEventListener('click', (e) => {
      const tr = (e.target as Element).closest('tr[data-index]') as HTMLElement | null;
      if (tr) this.select(Number(tr.dataset.index), true);
    });
    this.draw();
  }
  override disconnectedCallback(): void { this.grid?.removeEventListener('keydown', this.onKeyDown); }
  override attributeChangedCallback(): void { if (this.isConnected) this.draw(); }

  /** Set data then redraw. */
  setData(columns: DataTableColumn[], rows: Record<string, unknown>[], status: DataTableStatus = 'ready'): void {
    this.columns = columns; this.rows = rows;
    this.setAttribute('status', status);
    this.selected = -1;
    this.draw();
  }

  /** Restore persisted selection without stealing focus from filters/forms. */
  selectRow(index: number, focus = false): void { this.select(index, focus); }

  private draw(): void {
    const status = (this.getAttribute('status') as DataTableStatus) ?? 'ready';
    const grid = this.grid;
    if (!grid) return;

    if (status === 'loading') { grid.innerHTML = `<obra-loading-state label="Loading rows…"></obra-loading-state>`; return; }
    if (status === 'error') {
      grid.innerHTML = `<obra-error-state message="${this.escape(this.getAttribute('error-message') ?? '')}">
        <obra-button slot="actions" variant="secondary" id="retry">Retry</obra-button></obra-error-state>`;
      grid.querySelector('#retry')?.addEventListener('click', () =>
        this.dispatchEvent(new CustomEvent('obra-retry', { bubbles: true, composed: true })));
      return;
    }
    if (status === 'empty' || (status === 'ready' && this.rows.length === 0)) {
      grid.innerHTML = `<obra-empty-state heading="${this.escape(this.getAttribute('empty-message') ?? 'Nothing here yet')}"></obra-empty-state>`;
      return;
    }

    const head = this.columns.map((c) =>
      `<th scope="col" role="columnheader"${c.align ? ` align="${c.align}"` : ''}${c.width ? ` style="width:${c.width}"` : ''}>${this.escape(c.header)}</th>`).join('');
    const body = this.rows.map((row, i) =>
      `<tr data-index="${i}" role="row" tabindex="-1" aria-selected="${i === this.selected}">` +
      this.columns.map((c) => `<td role="gridcell"${c.align ? ` align="${c.align}"` : ''} title="${this.escape(String(row[c.key] ?? ''))}">${this.escape(String(row[c.key] ?? ''))}</td>`).join('') +
      `</tr>`).join('');
    grid.innerHTML = `<table role="grid" aria-label="${this.escape(this.getAttribute('aria-label') ?? 'Data table')}" aria-rowcount="${this.rows.length + 1}"><thead role="rowgroup"><tr role="row">${head}</tr></thead><tbody role="rowgroup">${body}</tbody></table>`;
    grid.removeAttribute('aria-rowcount');
  }

  private select(index: number, focus = false): void {
    if (index < 0 || index >= this.rows.length) return;
    this.selected = index;
    this.grid.querySelectorAll('tr[data-index]').forEach((tr) => {
      const on = Number((tr as HTMLElement).dataset.index) === index;
      tr.setAttribute('aria-selected', String(on));
      if (on && focus) (tr as HTMLElement).focus();
    });
    this.dispatchEvent(new CustomEvent('obra-row-select', { bubbles: true, composed: true, detail: { index, row: this.rows[index] } }));
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    const count = this.rows.length;
    if (!count) return;
    const cur = this.selected < 0 ? 0 : this.selected;
    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(cur + 1, count - 1);
    else if (e.key === 'ArrowUp') next = Math.max(cur - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (e.key === 'Enter' && this.selected >= 0) {
      this.dispatchEvent(new CustomEvent('obra-row-activate', { bubbles: true, composed: true, detail: { index: this.selected, row: this.rows[this.selected] } }));
      return;
    }
    if (next >= 0) { e.preventDefault(); this.select(next, true); }
  };

  private escape(s: string): string {
    return s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));
  }
}
export const defineDataTable = () =>
  customElements.get('obra-data-table') || customElements.define('obra-data-table', ObraDataTable);
