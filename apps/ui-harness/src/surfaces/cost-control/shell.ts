/**
 * Static DOM skeleton of the cost-control workspace.
 *
 * Built ONCE per mount. Every render pass afterwards updates text, attributes,
 * and pane contents in place — the shell (and therefore any focused input,
 * e.g. the search field) is never reconstructed while the user types
 * (ux/cost-control.yaml: "typing in search").
 *
 * Only @obra/ui custom elements are used for controls (Principle 3); plain
 * elements are semantic/layout carriers styled by src/harness.css with tokens
 * only (Principles 4, 5). No positive tabindex anywhere; `tabindex="-1"` only
 * for programmatic focus targets.
 */
import type {
  ObraButton,
  ObraConfirmationDialog,
  ObraDataTable,
  ObraSelect,
  ObraTabs,
  ObraTextField,
} from '@obra/ui';
import { el } from '../../dom.js';

/** Workspace sections, in tab order. Persisted as `section` in host state. */
export const SECTIONS = ['items', 'summary', 'ai'] as const;
export type SectionId = (typeof SECTIONS)[number];

export function sectionTabId(section: SectionId): string {
  return `section-${section}`;
}

export function isSectionId(value: string | null | undefined): value is SectionId {
  return value !== null && value !== undefined && (SECTIONS as readonly string[]).includes(value);
}

export interface CostControlShell {
  readonly root: HTMLElement;
  readonly countBadge: HTMLElement;
  readonly banner: HTMLElement;
  readonly projectSelect: ObraSelect;
  readonly addButton: ObraButton;
  readonly refreshButton: ObraButton;
  readonly analyzeButton: ObraButton;
  readonly cancelAnalysisButton: ObraButton;
  readonly status: HTMLElement;
  readonly tabs: ObraTabs;
  readonly searchField: ObraTextField;
  readonly categoryField: HTMLElement;
  readonly categorySelect: ObraSelect;
  readonly statusField: HTMLElement;
  readonly statusSelect: ObraSelect;
  readonly clearFiltersButton: ObraButton;
  readonly resultCount: HTMLElement;
  readonly addForm: HTMLElement;
  readonly addNameField: HTMLElement;
  readonly addNameInput: ObraTextField;
  readonly addCategorySelect: ObraSelect;
  readonly addStatusSelect: ObraSelect;
  readonly addCostField: HTMLElement;
  readonly addCostInput: ObraTextField;
  readonly addError: HTMLElement;
  readonly addSaveButton: ObraButton;
  readonly addCancelButton: ObraButton;
  readonly master: HTMLElement;
  readonly table: ObraDataTable;
  readonly detail: HTMLElement;
  readonly summary: HTMLElement;
  readonly ai: HTMLElement;
  readonly confirmDialog: ObraConfirmationDialog;
}

/**
 * Focus the interactive element inside a component's open shadow root.
 * ObraButton/ObraTextField/ObraSelect put the focusable node in shadow DOM,
 * so `hostElement.focus()` alone would do nothing.
 */
export function focusInner(component: HTMLElement, selector: string): void {
  const inner = component.shadowRoot?.querySelector(selector) as HTMLElement | null;
  inner?.focus();
}

export function focusButton(button: ObraButton): void {
  focusInner(button, '[part="control"]');
}

/**
 * Set the component's accessible name before it connects. TextField/Select
 * forward this attribute to the native input; FormField then uses its visible
 * label as the final name and forwards validation descriptions. No reliance
 * on a shadow root already being rendered during shell construction.
 */
export function labelInnerControl(component: HTMLElement, label: string): void {
  component.setAttribute('aria-label', label);
}

/** Set the value of an ObraSelect (attribute + inner native select). */
export function setSelectValue(select: ObraSelect, value: string): void {
  select.setAttribute('value', value);
  const inner = select.shadowRoot?.querySelector('select') as HTMLSelectElement | null;
  if (inner) inner.value = value;
}

export function setSelectOptions(select: ObraSelect, options: ReadonlyArray<{ value: string; label: string }>): void {
  select.replaceChildren(...options.map((option) => el('obra-option', { value: option.value }, option.label)));
}

function option(value: string, label: string): HTMLElement {
  return el('obra-option', { value }, label);
}

/** Build the whole workspace skeleton. Ids are the stable test selectors. */
export function buildShell(): CostControlShell {
  // Header: title + live row count + benchmark-data label (explicit, textual).
  const countBadge = el('obra-badge', { slot: 'actions', id: 'cc-count' }, '0');
  const header = el(
    'header',
    { class: 'obra-cost-control__header' },
    el('h1', { class: 'obra-cost-control__title' }, 'Cost Control'),
    countBadge,
    el('obra-badge', { slot: 'actions', id: 'cc-benchmark-badge' }, 'Benchmark data — mock host'),
  );

  const banner = el('p', { id: 'cc-banner', class: 'obra-cost-control__banner', hidden: '' });

  // Toolbar: project navigation + workspace actions + status live region.
  const projectSelect = el('obra-select', { id: 'cc-project' }) as ObraSelect;
  const projectField = el('obra-form-field', { label: 'Project' }, projectSelect);
  labelInnerControl(projectSelect, 'Project');

  const addButton = el('obra-button', { id: 'cc-add', variant: 'secondary' }, 'Add cost item') as ObraButton;
  const refreshButton = el('obra-button', { id: 'cc-refresh', variant: 'secondary' }, 'Refresh') as ObraButton;
  const analyzeButton = el('obra-button', { id: 'cc-analyze' }, 'Analyze costs') as ObraButton;
  const cancelAnalysisButton = el('obra-button', { id: 'cc-cancel-analysis', variant: 'secondary', hidden: '' }, 'Cancel analysis') as ObraButton;
  const status = el('span', { id: 'cc-status', role: 'status', class: 'obra-cost-control__hint' });
  const toolbar = el(
    'obra-toolbar',
    {},
    projectField,
    addButton,
    refreshButton,
    analyzeButton,
    cancelAnalysisButton,
    el('span', { slot: 'end', class: 'obra-cost-control__toolbar-end' }, status),
  );

  // Section navigation: Line items / Budget summary / AI review.
  const tabs = el(
    'obra-tabs',
    { id: 'cc-tabs', class: 'obra-cost-control__sections', active: 'section-items' },
    el('obra-tab', { id: 'section-items', slot: 'tab' }, 'Line items'),
    el('obra-tab', { id: 'section-summary', slot: 'tab' }, 'Budget summary'),
    el('obra-tab', { id: 'section-ai', slot: 'tab' }, 'AI review'),
  ) as ObraTabs;

  // Filters: labeled search + category + status, result count, clear action.
  const searchField = el('obra-text-field', { id: 'cc-search', type: 'search', placeholder: 'Search by name or id…' }) as ObraTextField;
  const searchFieldWrap = el('obra-form-field', { label: 'Search', class: 'obra-cost-control__filter-search' }, searchField);
  labelInnerControl(searchField, 'Search cost lines');
  const categorySelect = el('obra-select', { id: 'cc-filter-category' }) as ObraSelect;
  categorySelect.append(option('all', 'All categories'));
  const categoryField = el('obra-form-field', { label: 'Category' }, categorySelect);
  labelInnerControl(categorySelect, 'Filter by category');
  const statusSelect = el('obra-select', { id: 'cc-filter-status' }) as ObraSelect;
  statusSelect.append(option('all', 'All statuses'));
  const statusField = el('obra-form-field', { label: 'Status' }, statusSelect);
  labelInnerControl(statusSelect, 'Filter by status');
  const clearFiltersButton = el('obra-button', { id: 'cc-clear-filters', variant: 'secondary' }, 'Clear filters') as ObraButton;
  const resultCount = el('span', { id: 'cc-result-count', role: 'status', class: 'obra-cost-control__count' });
  const filters = el(
    'div',
    { class: 'obra-cost-control__filters' },
    searchFieldWrap,
    categoryField,
    statusField,
    clearFiltersButton,
    resultCount,
  );

  // Add-item form (hidden until "Add cost item" is activated).
  const addNameInput = el('obra-text-field', { id: 'cc-add-name' }) as ObraTextField;
  const addNameField = el('obra-form-field', { label: 'Line item name', required: '' }, addNameInput);
  labelInnerControl(addNameInput, 'Line item name');
  const addCategorySelect = el('obra-select', { id: 'cc-add-category' }) as ObraSelect;
  const addCategoryField = el('obra-form-field', { label: 'Category' }, addCategorySelect);
  labelInnerControl(addCategorySelect, 'Category');
  const addStatusSelect = el('obra-select', { id: 'cc-add-status' }) as ObraSelect;
  for (const value of ['approved', 'pending', 'flagged']) addStatusSelect.append(option(value, value));
  const addStatusField = el('obra-form-field', { label: 'Status' }, addStatusSelect);
  labelInnerControl(addStatusSelect, 'Status');
  const addCostInput = el('obra-text-field', { id: 'cc-add-cost', placeholder: '1250 or 1,250.40' }) as ObraTextField;
  const addCostField = el('obra-form-field', { label: 'Amount', hint: 'Plain positive amount, at most two decimals.' }, addCostInput);
  labelInnerControl(addCostInput, 'Amount');
  const addError = el('p', { id: 'cc-add-error', role: 'alert', class: 'obra-cost-control__error', hidden: '' });
  const addSaveButton = el('obra-button', { id: 'cc-add-save' }, 'Save item') as ObraButton;
  const addCancelButton = el('obra-button', { id: 'cc-add-cancel', variant: 'secondary' }, 'Cancel') as ObraButton;
  const addForm = el(
    'div',
    { id: 'cc-add-form', class: 'obra-cost-control__form', hidden: '' },
    el('h3', { class: 'obra-cost-control__form-title' }, 'Add cost item (benchmark data only)'),
    addNameField,
    addCategoryField,
    addStatusField,
    addCostField,
    addError,
    el('obra-stack', { gap: 'sm' }, addSaveButton, addCancelButton),
  );

  // Master-detail: table beside the detail pane.
  const table = el('obra-data-table', { id: 'cc-table' }) as ObraDataTable;
  const master = el('div', { slot: 'master', class: 'obra-cost-control__master' }, table);
  const detail = el('div', { id: 'cc-detail', class: 'obra-cost-control__detail', tabindex: '-1' });
  const masterDetail = el('obra-master-detail', { ratio: '58%', class: 'obra-cost-control__master-detail' }, master, detail);

  const itemsPanel = el(
    'obra-tab-panel',
    { for: 'section-items' },
    el('div', { class: 'obra-cost-control__items' }, filters, addForm, masterDetail),
  );
  const summary = el('div', { id: 'cc-summary', class: 'obra-cost-control__pane' });
  const summaryPanel = el('obra-tab-panel', { for: 'section-summary' }, summary);
  const ai = el('div', { id: 'cc-ai', class: 'obra-cost-control__pane' });
  const aiPanel = el('obra-tab-panel', { for: 'section-ai' }, ai);
  tabs.append(itemsPanel, summaryPanel, aiPanel);

  const confirmDialog = el('obra-confirmation-dialog', { id: 'cc-confirm' }) as ObraConfirmationDialog;

  const root = el('main', { class: 'obra-cost-control', 'data-state': 'loading', 'aria-label': 'Cost-control workspace' }, header, banner, toolbar, tabs, confirmDialog);
  table.setAttribute('aria-label', 'Project cost lines');

  return {
    root,
    countBadge,
    banner,
    projectSelect,
    addButton,
    refreshButton,
    analyzeButton,
    cancelAnalysisButton,
    status,
    tabs,
    searchField,
    categoryField,
    categorySelect,
    statusField,
    statusSelect,
    clearFiltersButton,
    resultCount,
    addForm,
    addNameField,
    addNameInput,
    addCategorySelect,
    addStatusSelect,
    addCostField,
    addCostInput,
    addError,
    addSaveButton,
    addCancelButton,
    master,
    table,
    detail,
    summary,
    ai,
    confirmDialog,
  };
}
