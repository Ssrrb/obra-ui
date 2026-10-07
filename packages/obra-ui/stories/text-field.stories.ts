import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/TextField',
  render: () => el('obra-text-field', { value: 'obra-studio' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placeholder: Story = {
  render: () => el('obra-text-field', { placeholder: 'Search projects…' }),
};

export const Invalid: Story = {
  render: () => el('obra-text-field', { value: 'not a url', invalid: true }),
};

export const Disabled: Story = {
  render: () => el('obra-text-field', { value: 'Read only', disabled: true }),
};

export const KeyboardFocus: Story = {
  render: () => el('obra-text-field', { value: 'Focused', class: 'obra-story-keyboard-focus' }),
};

export const ExtremeContent: Story = {
  render: () =>
    el('obra-text-field', {
      value: 'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    }),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-text-field', { value: 'obra-studio' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-text-field', { value: 'obra-studio' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-text-field', { value: 'obra-studio' })),
};
