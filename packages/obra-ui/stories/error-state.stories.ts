import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const error = (message: string, withRetry = false) =>
  el('obra-error-state', { message }, [
    ...(withRetry ? [el('obra-button', { variant: 'secondary', slot: 'actions' }, ['Retry'])] : []),
  ]);

const meta: Meta = {
  title: 'Patterns/ErrorState',
  render: () => error('The request failed. Check your connection and try again.'),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithRetry: Story = {
  render: () => error('The request failed. Check your connection and try again.', true),
};

export const ExtremeContent: Story = {
  render: () =>
    error(
      'The build failed while resolving dependencies for packages/obra-ui-storybook. The registry returned 503 for @storybook/web-components and the local cache did not contain a fallback, so the run stopped before it could compile anything.',
      true
    ),
};

export const LightTheme: Story = {
  render: () => themed('light', error('The request failed.', true)),
};

export const DarkTheme: Story = {
  render: () => themed('dark', error('The request failed.', true)),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', error('The request failed.', true)),
};
