import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const field = (attrs: Record<string, string | boolean>, value = 'obra-studio') =>
  el('obra-form-field', attrs, [el('obra-text-field', { value })]);

const meta: Meta = {
  title: 'Patterns/FormField',
  render: () => field({ label: 'Project name' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithHint: Story = {
  render: () => field({ label: 'Project name', hint: 'Lowercase letters, numbers, and dashes.' }),
};

export const Error: Story = {
  render: () =>
    el('obra-form-field', { label: 'Project name', error: 'A project with this name already exists.' }, [
      el('obra-text-field', { value: 'obra-studio', invalid: true }),
    ]),
};

export const Required: Story = {
  render: () => field({ label: 'Project name', required: true, hint: 'Required.' }),
};

export const Disabled: Story = {
  render: () =>
    el('obra-form-field', { label: 'Project name', hint: 'Managed by your organization.' }, [
      el('obra-text-field', { value: 'obra-studio', disabled: true }),
    ]),
};

export const ExtremeContent: Story = {
  render: () =>
    el(
      'obra-form-field',
      {
        label: 'Project name that is itself unusually long and wraps awkwardly in a narrow panel',
        hint: 'Lowercase letters, numbers, and dashes only — no spaces, no uppercase, and no leading dash either.',
        error: 'A project with this name already exists in the current organization; choose a different name.',
      },
      [el('obra-text-field', { value: 'obra-studio', invalid: true })]
    ),
};

export const LightTheme: Story = {
  render: () => themed('light', field({ label: 'Project name', hint: 'Lowercase letters.' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', field({ label: 'Project name', hint: 'Lowercase letters.' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', field({ label: 'Project name', hint: 'Lowercase letters.' })),
};
