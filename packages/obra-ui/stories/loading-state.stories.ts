import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const loading = (label = 'Loading…') => el('obra-loading-state', { label });

const meta: Meta = {
  title: 'Patterns/LoadingState',
  render: () => loading(),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const CustomLabel: Story = {
  render: () => loading('Loading projects…'),
};

export const ExtremeContent: Story = {
  render: () =>
    loading(
      'Loading every project, its members, and the most recent run for each one — this can take a moment on large organizations'
    ),
};

export const LightTheme: Story = {
  render: () => themed('light', loading()),
};

export const DarkTheme: Story = {
  render: () => themed('dark', loading()),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', loading()),
};
