import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Primitives/TextArea',
  render: () => el('obra-text-area', { value: 'Describe the change…', rows: 3 }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Placeholder: Story = {
  render: () => el('obra-text-area', { placeholder: 'Describe the change…', rows: 3 }),
};

export const Invalid: Story = {
  render: () => el('obra-text-area', { value: 'Too short', invalid: true, rows: 3 }),
};

export const Disabled: Story = {
  render: () => el('obra-text-area', { value: 'Read only', disabled: true, rows: 3 }),
};

export const KeyboardFocus: Story = {
  render: () => el('obra-text-area', { value: 'Focused', class: 'obra-story-keyboard-focus', rows: 3 }),
};

export const ExtremeContent: Story = {
  render: () =>
    el('obra-text-area', {
      rows: 6,
      value:
        'A very long multi-line value. '.repeat(20) +
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    }),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-text-area', { value: 'Describe the change…', rows: 3 })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-text-area', { value: 'Describe the change…', rows: 3 })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-text-area', { value: 'Describe the change…', rows: 3 })),
};
