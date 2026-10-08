import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, svgIcon, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Button',
  render: () => el('obra-button', { variant: 'primary' }, ['Button']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Secondary: Story = {
  render: () => el('obra-button', { variant: 'secondary' }, ['Secondary']),
};

export const Disabled: Story = {
  render: () => el('obra-button', { variant: 'primary', disabled: true }, ['Save']),
};

export const Loading: Story = {
  render: () => el('obra-button', { variant: 'primary', loading: true }, ['Saving…']),
};

export const Icon: Story = {
  render: () =>
    el('obra-button', { variant: 'primary' }, [
      svgIcon('M8 2v12M2 8h12'),
      'Add project',
    ]),
};

export const KeyboardFocus: Story = {
  render: () =>
    el('obra-button', { variant: 'primary', class: 'obra-story-keyboard-focus' }, ['Focused']),
};

export const LongLabel: Story = {
  render: () =>
    el('obra-button', { variant: 'primary' }, [
      'Run all checks across every workspace in this project',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-button', { variant: 'primary' }, ['Save'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-button', { variant: 'primary' }, ['Save'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-button', { variant: 'primary' }, ['Save'])),
};
