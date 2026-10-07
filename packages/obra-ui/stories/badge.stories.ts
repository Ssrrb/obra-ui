import type { Meta, StoryObj } from '@storybook/web-components';
import { el, row, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Badge',
  render: () => el('obra-badge', {}, ['Preview']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Count: Story = {
  render: () => row(el('obra-badge', {}, ['3']), el('obra-badge', {}, ['99+'])),
};

export const ExtremeContent: Story = {
  render: () => el('obra-badge', {}, ['a very long badge label that keeps going']),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-badge', {}, ['Preview'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-badge', {}, ['Preview'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-badge', {}, ['Preview'])),
};
