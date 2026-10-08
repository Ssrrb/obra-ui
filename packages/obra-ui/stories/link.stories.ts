import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, row, svgIcon, themed } from './_dom';

// States that do not apply (COMPONENT_RULES.md): a Link has no loading and no
// empty state — it is static text that navigates. Error is a FormField concern,
// not a link variant. Disabled, focus-visible, extreme content and all three
// themes are covered below.

const meta: Meta = {
  title: 'Primitives/Link',
  render: () => el('obra-link', { href: '#' }, ['Open the cost report']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

/** A link navigates. For an action or a command, use Button/IconButton. */
export const Inline: Story = {
  render: () =>
    el('p', { style: 'margin: 0; max-width: 46ch;' }, [
      'Budget overruns are reported per section — see ',
      el('obra-link', { href: '#' }, ['how costs are grouped']),
      ' before you edit a line.',
    ]),
};

export const External: Story = {
  render: () =>
    row(
      el('obra-link', { href: 'https://example.com/docs', target: '_blank' }, [
        'Read the API docs',
        svgIcon('M9 3h4v4M13 3L7 9M11 8v4a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h4'),
      ]),
      // rel is forced to "noopener noreferrer" for target="_blank" when unset.
      el('span', { style: 'color: var(--obra-text-secondary);' }, ['rel added automatically'])
    ),
};

export const Disabled: Story = {
  render: () => el('obra-link', { href: '#', disabled: true }, ['Open the cost report']),
};

export const KeyboardFocus: Story = {
  render: () =>
    el('obra-link', { href: '#', class: 'obra-story-keyboard-focus' }, ['Open the cost report']),
};

export const ExtremeContent: Story = {
  render: () =>
    el('div', { style: 'max-width: 240px;' }, [
      el('obra-link', { href: '#' }, [
        'https://example.com/workspaces/obra-studio/reports/cost-control/2024/11/line-items?section=infrastructure&compare=previous-quarter',
      ]),
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-link', { href: '#' }, ['Open the cost report'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-link', { href: '#' }, ['Open the cost report'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-link', { href: '#' }, ['Open the cost report'])),
};
