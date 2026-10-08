import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const meta: Meta = {
  title: 'Patterns/PropertyRow',
  render: () => el('obra-property-row', { label: 'Owner', value: 'obra-studio' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const LongValue: Story = {
  render: () =>
    el('obra-property-row', {
      label: 'Repository',
      value: 'github.com/obra-studio/platform/packages/obra-ui-storybook',
    }),
};

export const ExtremeContent: Story = {
  render: () =>
    el('obra-property-row', {
      label: 'A label that is itself quite long',
      value:
        'aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
    }),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-property-row', { label: 'Owner', value: 'obra-studio' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-property-row', { label: 'Owner', value: 'obra-studio' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-property-row', { label: 'Owner', value: 'obra-studio' })),
};
