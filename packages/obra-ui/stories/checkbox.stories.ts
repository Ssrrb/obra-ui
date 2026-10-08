import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/Checkbox',
  render: () => el('obra-checkbox', {}, ['Enable preview']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Checked: Story = {
  render: () => el('obra-checkbox', { checked: true }, ['Enable preview']),
};

export const Disabled: Story = {
  render: () => el('obra-checkbox', { disabled: true }, ['Enable preview']),
};

export const DisabledChecked: Story = {
  render: () => el('obra-checkbox', { checked: true, disabled: true }, ['Enable preview']),
};

export const KeyboardFocus: Story = {
  render: () => el('obra-checkbox', { class: 'obra-story-keyboard-focus' }, ['Enable preview']),
};

export const LongLabel: Story = {
  render: () =>
    el('obra-checkbox', { checked: true }, [
      'Publish this change to every connected workspace when the build succeeds',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-checkbox', { checked: true }, ['Enable preview'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-checkbox', { checked: true }, ['Enable preview'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-checkbox', { checked: true }, ['Enable preview'])),
};
