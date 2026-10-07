import type { Meta, StoryObj } from '@storybook/web-components';
import type { DataTableColumn, DataTableStatus } from '@obra/ui';
import { el, themed } from './_dom';

type TableElement = HTMLElement & {
  setData(
    columns: DataTableColumn[],
    rows: Record<string, unknown>[],
    status?: DataTableStatus
  ): void;
};

const columns: DataTableColumn[] = [
  { key: 'name', header: 'Name' },
  { key: 'owner', header: 'Owner' },
  { key: 'status', header: 'Status' },
  { key: 'updated', header: 'Updated', align: 'end' },
];

const row = (i: number) => ({
  name: `project-${i + 1}`,
  owner: i % 2 === 0 ? 'obra-studio' : 'platform-team',
  status: i % 3 === 0 ? 'active' : i % 3 === 1 ? 'archived' : 'draft',
  updated: `2025-01-${String((i % 28) + 1).padStart(2, '0')}`,
});

const rows = (count: number) => Array.from({ length: count }, (_, i) => row(i));

function table(
  options: {
    columns?: DataTableColumn[];
    rows?: Record<string, unknown>[];
    status?: DataTableStatus;
    errorMessage?: string;
    emptyMessage?: string;
  } = {}
): TableElement {
  const attrs: Record<string, string> = {};
  if (options.errorMessage) attrs['error-message'] = options.errorMessage;
  if (options.emptyMessage) attrs['empty-message'] = options.emptyMessage;
  const node = el('obra-data-table', attrs) as TableElement;
  node.setData(options.columns ?? columns, options.rows ?? rows(5), options.status ?? 'ready');
  return node;
}

const focusRow = async (context: { canvasElement: HTMLElement }): Promise<void> => {
  const host = context.canvasElement.querySelector('obra-data-table');
  const grid = host?.shadowRoot?.querySelector('[part="control"]') as HTMLElement | null;
  grid?.focus();
  grid?.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
};

const selectRow = async (context: { canvasElement: HTMLElement }): Promise<void> => {
  const host = context.canvasElement.querySelector('obra-data-table');
  const target = host?.shadowRoot?.querySelectorAll('tr[data-index]')[1] as HTMLElement | undefined;
  target?.dispatchEvent(new MouseEvent('click', { bubbles: true }));
};

const meta: Meta = {
  title: 'Patterns/DataTable',
  render: () => table(),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Normal: Story = {};

export const Empty: Story = {
  render: () => table({ status: 'empty', emptyMessage: 'No projects yet' }),
};

export const Loading: Story = {
  render: () => table({ status: 'loading' }),
};

export const Error: Story = {
  render: () =>
    table({ status: 'error', errorMessage: 'Could not load projects. Try again.' }),
};

export const OneRow: Story = {
  name: '1 row',
  render: () => table({ rows: rows(1) }),
};

export const ThousandRows: Story = {
  name: '1000 rows',
  render: () => table({ rows: rows(1000) }),
};

export const LongValues: Story = {
  render: () =>
    table({
      rows: [
        {
          name: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
          owner: 'a-team-with-a-very-long-organization-qualified-name',
          status: 'a status value that runs well past its column',
          updated: '2025-12-31T23:59:59.999Z',
        },
      ],
    }),
};

export const Selected: Story = {
  play: selectRow,
};

export const KeyboardNavigation: Story = {
  play: focusRow,
};

export const LightTheme: Story = {
  render: () => themed('light', table()),
};

export const DarkTheme: Story = {
  render: () => themed('dark', table()),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', table()),
};
