import type { Meta, StoryObj } from '@storybook/web-components';
import { el, themed } from './_dom';

const select = (value: string | undefined, options: string[], disabled = false) =>
  el(
    'obra-select',
    { ...(value ? { value } : {}), ...(disabled ? { disabled: true } : {}) },
    options.map((option) => el('obra-option', { value: option.toLowerCase() }, [option]))
  );

const meta: Meta = {
  title: 'Primitives/Select',
  render: () => select('balanced', ['Fast', 'Balanced', 'Thorough']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Selected: Story = {
  render: () => select('thorough', ['Fast', 'Balanced', 'Thorough']),
};

export const Disabled: Story = {
  render: () => select('fast', ['Fast', 'Balanced', 'Thorough'], true),
};

export const ManyOptions: Story = {
  render: () =>
    select('option 12', Array.from({ length: 40 }, (_, i) => `Option ${i + 1}`)),
};

export const LongOptions: Story = {
  render: () =>
    select('the longest one', [
      'Short',
      'A considerably longer option label that will not fit in a narrow control',
      'The longest one — a single option that runs well past the control width',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', select('balanced', ['Fast', 'Balanced', 'Thorough'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', select('balanced', ['Fast', 'Balanced', 'Thorough'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', select('balanced', ['Fast', 'Balanced', 'Thorough'])),
};
