import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Progress',
  render: () => el('obra-progress', { value: 40 }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {
  render: () => el('obra-progress', { value: 0 }),
};

export const Half: Story = {
  render: () => el('obra-progress', { value: 50 }),
};

export const Complete: Story = {
  render: () => el('obra-progress', { value: 100 }),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-progress', { value: 40 })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-progress', { value: 40 })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-progress', { value: 40 })),
};
