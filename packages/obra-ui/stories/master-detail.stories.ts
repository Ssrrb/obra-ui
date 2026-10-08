import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const masterItem = (label: string, selected = false) =>
  el(
    'div',
    {
      style:
        `padding: var(--obra-space-sm); border-bottom: var(--obra-border-width-default) solid var(--obra-border-default);` +
        (selected
          ? ` background: var(--obra-surface-selected); color: var(--obra-text-on-action);`
          : ''),
    },
    [label]
  );

const masterDetail = (items: string[]) =>
  el('obra-master-detail', { style: 'height: 360px' }, [
    el('div', { slot: 'master' }, items.map((label, i) => masterItem(label, i === 0))),
    el('div', { style: 'padding: var(--obra-space-lg)' }, [
      el('obra-section-header', {}, ['project-1']),
      el('obra-property-row', { label: 'Owner', value: 'obra-studio' }),
      el('obra-property-row', { label: 'Status', value: 'active' }),
    ]),
  ]);

const meta: Meta = {
  title: 'Patterns/MasterDetail',
  render: () => masterDetail(['project-1', 'project-2', 'project-3']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Empty: Story = {
  render: () =>
    el('obra-master-detail', { style: 'height: 360px' }, [
      el('div', { slot: 'master' }, [
        el('obra-empty-state', { heading: 'No projects', message: 'Nothing to select.' }),
      ]),
      el('div', { style: 'padding: var(--obra-space-lg)' }, [
        el('obra-empty-state', { heading: 'Nothing selected', message: 'Pick a project on the left.' }),
      ]),
    ]),
};

export const ExtremeContent: Story = {
  render: () => masterDetail(Array.from({ length: 40 }, (_, i) => `project-${i + 1}`)),
};

export const LightTheme: Story = {
  render: () => themed('light', masterDetail(['project-1', 'project-2', 'project-3'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', masterDetail(['project-1', 'project-2', 'project-3'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', masterDetail(['project-1', 'project-2', 'project-3'])),
};
