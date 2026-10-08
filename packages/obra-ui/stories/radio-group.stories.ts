import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const options = ['Fast', 'Balanced', 'Thorough'];

const group = (value?: string, disabled = false, labels = options) =>
  el(
    'obra-radio-group',
    disabled ? { disabled: true, ...(value ? { value } : {}) } : value ? { value } : {},
    labels.map((label) => el('obra-radio', { value: label.toLowerCase() }, [label]))
  );

const meta: Meta = {
  title: 'Primitives/RadioGroup',
  render: () => group('balanced'),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  render: () => group('thorough'),
};

export const Disabled: Story = {
  render: () => group('fast', true),
};

export const LongLabels: Story = {
  render: () =>
    group(undefined, false, [
      'Fast — minimal checks, optimized for quick iterations during development',
      'Balanced — the default set of checks for everyday work',
      'Thorough — every check, including the slow ones, before a release',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', group('balanced')),
};

export const DarkTheme: Story = {
  render: () => themed('dark', group('balanced')),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', group('balanced')),
};
