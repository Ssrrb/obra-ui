import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/IconButton',
  render: () => el('obra-icon-button', { icon: '＋', label: 'Add' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Disabled: Story = {
  render: () => el('obra-icon-button', { icon: '＋', label: 'Add', disabled: true }),
};

export const KeyboardFocus: Story = {
  render: () => el('obra-icon-button', { icon: '＋', label: 'Add', class: 'obra-story-keyboard-focus' }),
};

export const ExtremeContent: Story = {
  render: () => el('obra-icon-button', { icon: '✦✧❖✱✚❉', label: 'Many glyphs' }),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-icon-button', { icon: '＋', label: 'Add' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-icon-button', { icon: '＋', label: 'Add' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-icon-button', { icon: '＋', label: 'Add' })),
};
