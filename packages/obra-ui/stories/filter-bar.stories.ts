import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const filterBar = (placeholder = 'Filter projects…') =>
  el('obra-filter-bar', { placeholder }, [
    el('obra-select', { slot: 'filters', value: 'all' }, [
      el('obra-option', { value: 'all' }, ['All statuses']),
      el('obra-option', { value: 'active' }, ['Active']),
      el('obra-option', { value: 'archived' }, ['Archived']),
    ]),
  ]);

const meta: Meta = {
  title: 'Patterns/FilterBar',
  render: () => filterBar(),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const ExtremelyLongPlaceholder: Story = {
  render: () => filterBar('Filter by name, owner, status, tag, or the date it was last updated'),
};

export const LightTheme: Story = {
  render: () => themed('light', filterBar()),
};

export const DarkTheme: Story = {
  render: () => themed('dark', filterBar()),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', filterBar()),
};
