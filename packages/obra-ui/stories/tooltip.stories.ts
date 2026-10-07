import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const tooltip = (text: string, open = false) =>
  el('obra-tooltip', { text, ...(open ? { open: true } : {}) }, [
    el('obra-button', { variant: 'secondary' }, ['Hover or focus me']),
  ]);

const meta: Meta = {
  title: 'Primitives/Tooltip',
  render: () => tooltip('Shown on hover or keyboard focus'),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Open: Story = {
  render: () => tooltip('Shown on hover or keyboard focus', true),
};

export const ExtremeContent: Story = {
  render: () =>
    tooltip(
      'A deliberately long tooltip describing exactly what this control does, when it is enabled, and what happens after it runs',
      true
    ),
};

export const LightTheme: Story = {
  render: () => themed('light', tooltip('Shown on hover or keyboard focus', true)),
};

export const DarkTheme: Story = {
  render: () => themed('dark', tooltip('Shown on hover or keyboard focus', true)),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', tooltip('Shown on hover or keyboard focus', true)),
};
