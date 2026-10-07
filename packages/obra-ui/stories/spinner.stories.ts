import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Spinner',
  render: () => el('obra-spinner', { label: 'Loading' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithLabel: Story = {
  render: () => el('obra-spinner', { label: 'Loading projects' }, ['Loading projects…']),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-spinner', { label: 'Loading' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-spinner', { label: 'Loading' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-spinner', { label: 'Loading' })),
};
