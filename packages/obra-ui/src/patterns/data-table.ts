import { ObraElement } from '../foundations/element.js';
import { BASE_CSS } from '../foundations/styles.js';
import type { ObraMenu } from '../primitives/menu.js';

export interface DataTableActionItem {
  id: string;
  label: string;
}

export interface DataTableAction {
  id: string;
  label: string;
  /** 'inline' (default) is a text action; 'menu' is an overflow button with `items`. */
  kind?: 'inline' | 'menu';
  items?: DataTableActionItem[];
}

export interface DataTableColumn {
  key: string;
  header: string;
  width?: string;
  align?: 'start' | 'end';
  /** Money and quantity columns: tabular figures so digits align column-wise. */
  figures?: 'tabular';
  /** Accessible name when `header` is empty (for example an actions column). */
  headerLabel?: string;
  /**
   * Custom cell content: return a Node for markup or a string, which is
   * inserted as text — never as HTML. Nodes live inside this element's shadow
   * root, so they must bring their own styles (an `obra-*` element, or inline
   * styles); document CSS does not reach them.
   */
  render?: (row: Record<string, unknown>, index: number) => Node | string;
  /**
   * Per-row actions, rendered with the table's own styles. Takes precedence
   * over `render`/`key` for that column. Inline actions and menu items fire
   * `obra-row-action` with `{ index, row, actionId }`.
   */
  actions?: (row: Record<string, unknown>, index: number) => DataTableAction[];
}

export type DataTableEmphasis = 'group' | 'total';

/**
 * A row with presentation metadata. Plain records work everywhere; the spec
 * form adds tree depth and emphasis. `values` is reserved for this form — a
 * column key named `values` is not supported on plain records.
 */
export interface DataTableRowSpec {
  values: Record<string, unknown>;
  /** Tree depth of the first cell: 0 none, 1 one step, … */
  level?: number;
  /** Bold group or total treatment. */
  emphasis?: DataTableEmphasis;
}
export type DataTableRow = Record<string, unknown> | DataTableRowSpec;

export type DataTableStatus = 'loading' | 'empty' | 'error' | 'ready';

function isRowSpec(row: DataTableRow): row is DataTableRowSpec {
  const values = (row as DataTableRowSpec).values;
  return typeof values === 'object' && values !== null && !Array.isArray(values);
}

/**
 * <obra-data-table> — token-themed table with the four required states and
 * keyboard navigation. Data is set via `.setData(columns, rows, status)`
 * (not attributes) so large datasets are cheap. Rows may carry a tree level
 * and a group/total emphasis; columns may render custom content or per-row
 * actions with menus.
 *
 * Keyboard: ArrowUp/Down move selection, Home/End jump, Enter fires
 * obra-row-activate (an open <obra-menu> keeps its own arrow keys). role=grid
 * with row/cell semantics. Events: obra-row-select, obra-row-activate,
 * obra-row-action, obra-retry. Extracted from the toolkit data-grid behavior;
 * reimplemented without FAST and without shipping a virtualization dependency
 * (host can page for very large sets).
 */
export class ObraDataTable extends ObraElement {
  static observedAttributes = ['status', 'error-message', 'empty-message'];

  columns: DataTableColumn[] = [];
  rows: DataTableRow[] = [];
  private selected = -1;
  private openMenu: ObraMenu | null = null;
  private openTrigger: HTMLElement | null = null;

  protected override styles(): string {
    return `${BASE_CSS}
      :host { display: block; overflow: auto; overscroll-behavior: contain; }
      table { width: 100%; border-collapse: collapse; font-size: var(--obra-font-small); }
      th, td { text-align: start; padding: 0 var(--obra-data-table-cell-padding-x);
        height: var(--obra-data-table-row-height); vertical-align: middle; white-space: nowrap;
        overflow: hidden; text-overflow: ellipsis; max-width: 32ch; }
      td[data-render] { overflow: visible; text-overflow: clip; }
      td[data-figures="tabular"] { font-variant-numeric: tabular-nums; }
      tr[data-emphasis] td { font-weight: var(--obra-font-weight-bold); }
      tr[data-emphasis="total"] td { border-top: var(--obra-border-width-default) solid var(--obra-data-table-border); }
      thead th { position: sticky; top: 0; background: var(--obra-surface-raised);
        color: var(--obra-text-secondary); font-weight: var(--obra-font-weight-bold);
        border-bottom: var(--obra-border-width-default) solid var(--obra-data-table-border); }
      tbody tr { border-bottom: var(--obra-border-width-default) solid var(--obra-data-table-border); cursor: default; }
      @media (hover: hover) { tbody tr:hover { background: var(--obra-data-table-row-hover-background); } }
      tbody tr[aria-selected="true"] { background: var(--obra-data-table-row-selected-background);
        color: var(--obra-list-active-selection-foreground, var(--obra-text-primary)); }
      [part="control"]:focus-visible { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); }
      tbody tr:focus-visible { outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); outline-offset: -2px; }
      td[align="end"], th[align="end"] { text-align: end; }
      .obra-actions { display: inline-flex; align-items: center; justify-content: flex-end;
        gap: var(--obra-space-1); width: 100%; }
      .obra-visually-hidden { position: absolute; width: 1px; height: 1px; margin: -1px;
        padding: 0; border: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }
      .obra-action { height: 18px; padding: 0 var(--obra-space-1); border: none;
        border-radius: var(--obra-radius-control); background: transparent; color: var(--obra-text-link);
        font: inherit; font-size: var(--obra-font-small); white-space: nowrap; cursor: pointer; }
      .obra-action:hover { color: var(--obra-text-link-active); text-decoration: underline; }
      .obra-action-menu { display: inline-grid; place-items: center; width: 20px; height: 20px;
        padding: 0; border: none; border-radius: var(--obra-radius-control); background: transparent;
        color: var(--obra-text-secondary); font: inherit; font-size: var(--obra-font-size-md); cursor: pointer; }
      @media (hover: hover) { .obra-action-menu:hover { background: var(--obra-surface-hover); color: var(--obra-text-primary); } }
      .obra-action:focus-visible, .obra-action-menu:focus-visible {
        outline: var(--obra-border-width-thick) solid var(--obra-focus-ring); outline-offset: -1px; }
      .obra-actions__menu-wrap { position: relative; display: inline-flex; }
      .obra-actions__menu-wrap obra-menu { position: absolute; inset-inline-end: 0;
        top: calc(100% + var(--obra-border-width-default)); z-index: 20; }`;
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
  override disconnectedCallback(): void {
    this.grid?.removeEventListener('keydown', this.onKeyDown);
    document.removeEventListener('click', this.onDocumentClick, true);
  }
  override attributeChangedCallback(): void { if (this.isConnected) this.draw(); }

  /** Set data then redraw. */
  setData(columns: DataTableColumn[], rows: DataTableRow[], status: DataTableStatus = 'ready'): void {
    this.columns = columns; this.rows = rows;
    this.setAttribute('status', status);
    this.selected = -1;
    this.closeMenu();
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

    const table = document.createElement('table');
    table.setAttribute('role', 'grid');
    table.setAttribute('aria-label', this.getAttribute('aria-label') ?? 'Data table');
    table.setAttribute('aria-rowcount', String(this.rows.length + 1));

    const thead = document.createElement('thead');
    thead.setAttribute('role', 'rowgroup');
    const headRow = document.createElement('tr');
    headRow.setAttribute('role', 'row');
    for (const column of this.columns) {
      const th = document.createElement('th');
      th.setAttribute('role', 'columnheader');
      if (column.align) th.setAttribute('align', column.align);
      if (column.width) th.style.width = column.width;
      if (column.header) th.textContent = column.header;
      else {
        // Axe's empty-table-header wants visible text; a clipped label reads to
        // screen readers and satisfies has-visible-text, so the column stays
        // visually empty without an empty header.
        const label = document.createElement('span');
        label.className = 'obra-visually-hidden';
        label.textContent = column.headerLabel ?? column.key;
        th.append(label);
      }
      headRow.append(th);
    }
    thead.append(headRow);

    const tbody = document.createElement('tbody');
    tbody.setAttribute('role', 'rowgroup');
    this.rows.forEach((row, index) => {
      const spec = isRowSpec(row) ? row : null;
      const values = spec ? spec.values : (row as Record<string, unknown>);
      const tr = document.createElement('tr');
      tr.dataset.index = String(index);
      tr.setAttribute('role', 'row');
      tr.tabIndex = -1;
      tr.setAttribute('aria-selected', String(index === this.selected));
      if (spec?.emphasis) tr.setAttribute('data-emphasis', spec.emphasis);
      const level = spec?.level ?? 0;

      this.columns.forEach((column, cellIndex) => {
        const td = document.createElement('td');
        td.setAttribute('role', 'gridcell');
        if (column.align) td.setAttribute('align', column.align);
        if (column.figures === 'tabular') td.setAttribute('data-figures', 'tabular');
        if (cellIndex === 0 && level > 0) {
          td.style.paddingInlineStart =
            `calc(var(--obra-data-table-cell-padding-x) + ${level} * var(--obra-data-table-indent-step))`;
        }
        const content = column.actions
          ? this.actionsCell(column.actions(values, index), index)
          : column.render ? column.render(values, index) : values[column.key];
        if (column.actions || column.render) td.setAttribute('data-render', '');
        if (content instanceof Node) {
          td.append(content);
        } else {
          const text = content == null ? '' : String(content);
          td.textContent = text;
          if (text) td.title = text;
        }
        tr.append(td);
      });
      tbody.append(tr);
    });

    table.append(thead, tbody);
    grid.replaceChildren(table);
  }

  private actionsCell(actions: DataTableAction[], rowIndex: number): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'obra-actions';
    for (const action of actions) {
      wrap.append(action.kind === 'menu' ? this.menuAction(action, rowIndex) : this.inlineAction(action, rowIndex));
    }
    return wrap;
  }

  private inlineAction(action: DataTableAction, rowIndex: number): HTMLElement {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'obra-action';
    button.textContent = action.label;
    button.addEventListener('click', (e) => { e.stopPropagation(); this.fireRowAction(rowIndex, action.id); });
    return button;
  }

  private menuAction(action: DataTableAction, rowIndex: number): HTMLElement {
    const wrap = document.createElement('span');
    wrap.className = 'obra-actions__menu-wrap';
    const trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'obra-action-menu';
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-label', action.label);
    trigger.textContent = '…';

    const menu = document.createElement('obra-menu') as ObraMenu;
    for (const item of action.items ?? []) {
      const menuItem = document.createElement('obra-menu-item');
      menuItem.setAttribute('value', item.id);
      menuItem.textContent = item.label;
      menu.append(menuItem);
    }

    trigger.addEventListener('click', (e) => {
      e.stopPropagation();
      if (this.openMenu === menu) this.closeMenu();
      else this.openMenuFor(menu, trigger);
    });
    menu.addEventListener('obra-select', (e) => {
      const id = (e as CustomEvent<{ value?: string }>).detail?.value;
      if (id) this.fireRowAction(rowIndex, id);
    });
    menu.addEventListener('obra-close', () => {
      if (this.openMenu === menu) { this.openMenu = null; this.openTrigger = null; document.removeEventListener('click', this.onDocumentClick, true); }
    });

    wrap.append(trigger, menu);
    return wrap;
  }

  private openMenuFor(menu: ObraMenu, trigger: HTMLElement): void {
    this.closeMenu();
    this.openMenu = menu;
    this.openTrigger = trigger;
    menu.open();
    // Clicks outside the menu close it; wait one tick so this click does not.
    setTimeout(() => document.addEventListener('click', this.onDocumentClick, true), 0);
  }

  private closeMenu(): void {
    const menu = this.openMenu;
    this.openMenu = null;
    this.openTrigger = null;
    document.removeEventListener('click', this.onDocumentClick, true);
    menu?.close();
  }

  /** composedPath survives shadow retargeting: a menu inside a shadow still
   * sees its own trigger clicks as inside. */
  private onDocumentClick = (e: MouseEvent): void => {
    if (!this.openMenu) return;
    const path = e.composedPath();
    if (path.includes(this.openMenu) || (this.openTrigger && path.includes(this.openTrigger))) return;
    this.closeMenu();
  };

  private fireRowAction(index: number, actionId: string): void {
    this.dispatchEvent(new CustomEvent('obra-row-action', {
      bubbles: true, composed: true, detail: { index, row: this.rowValues(index), actionId },
    }));
  }

  private select(index: number, focus = false): void {
    if (index < 0 || index >= this.rows.length) return;
    this.selected = index;
    this.grid.querySelectorAll('tr[data-index]').forEach((tr) => {
      const on = Number((tr as HTMLElement).dataset.index) === index;
      tr.setAttribute('aria-selected', String(on));
      if (on && focus) (tr as HTMLElement).focus();
    });
    this.dispatchEvent(new CustomEvent('obra-row-select', { bubbles: true, composed: true, detail: { index, row: this.rowValues(index) } }));
  }

  private rowValues(index: number): Record<string, unknown> {
    const row = this.rows[index];
    return isRowSpec(row) ? row.values : (row as Record<string, unknown>);
  }

  private onKeyDown = (e: KeyboardEvent): void => {
    // An open menu owns its arrow keys; the grid must not move underneath it.
    if ((e.target as Element | null)?.closest?.('obra-menu')) return;
    const count = this.rows.length;
    if (!count) return;
    const cur = this.selected < 0 ? 0 : this.selected;
    let next = -1;
    if (e.key === 'ArrowDown') next = Math.min(cur + 1, count - 1);
    else if (e.key === 'ArrowUp') next = Math.max(cur - 1, 0);
    else if (e.key === 'Home') next = 0;
    else if (e.key === 'End') next = count - 1;
    else if (e.key === 'Enter' && this.selected >= 0) {
      this.dispatchEvent(new CustomEvent('obra-row-activate', { bubbles: true, composed: true, detail: { index: this.selected, row: this.rowValues(this.selected) } }));
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
