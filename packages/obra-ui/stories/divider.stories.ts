import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Divider',
  render: () => el('obra-divider', {}),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Horizontal: Story = {};

export const Vertical: Story = {
  render: () =>
    el('div', { style: 'display:flex; align-items:center; gap: var(--obra-space-sm); height: 32px;' }, [
      el('span', {}, ['Before']),
      el('obra-divider', { orientation: 'vertical' }),
      el('span', {}, ['After']),
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-divider', {})),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-divider', {})),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-divider', {})),
};
