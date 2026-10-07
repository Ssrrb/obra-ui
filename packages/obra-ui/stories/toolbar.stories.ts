import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const toolbar = (withEnd = true) =>
  el('obra-toolbar', {}, [
    el('obra-button', { variant: 'primary' }, ['Run']),
    el('obra-button', { variant: 'secondary' }, ['Stop']),
    el('obra-icon-button', { icon: '⟳', label: 'Refresh' }),
    ...(withEnd ? [el('obra-button', { variant: 'secondary', slot: 'end' }, ['Settings'])] : []),
  ]);

const meta: Meta = {
  title: 'Patterns/Toolbar',
  render: () => toolbar(),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithoutEndActions: Story = {
  render: () => toolbar(false),
};

export const LongLabels: Story = {
  render: () =>
    el('obra-toolbar', {}, [
      el('obra-button', { variant: 'primary' }, ['Run all checks across every workspace']),
      el('obra-button', { variant: 'secondary' }, ['Stop the currently running job']),
      el('obra-button', { variant: 'secondary', slot: 'end' }, [
        'Open the project settings panel',
      ]),
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', toolbar()),
};

export const DarkTheme: Story = {
  render: () => themed('dark', toolbar()),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', toolbar()),
};
