import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const header = (label: string, withActions = false) =>
  el('obra-section-header', {}, [
    label,
    ...(withActions
      ? [el('obra-button', { variant: 'secondary', slot: 'actions' }, ['New project'])]
      : []),
  ]);

const meta: Meta = {
  title: 'Patterns/SectionHeader',
  render: () => header('Projects'),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithActions: Story = {
  render: () => header('Projects', true),
};

export const ExtremeContent: Story = {
  render: () =>
    header('Projects that are currently active across every connected workspace', true),
};

export const LightTheme: Story = {
  render: () => themed('light', header('Projects', true)),
};

export const DarkTheme: Story = {
  render: () => themed('dark', header('Projects', true)),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', header('Projects', true)),
};
