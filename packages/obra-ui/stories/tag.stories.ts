import type { Meta, StoryObj } from '@storybook/web-components';
import { el, row, themed } from './_dom';

// States that do not apply (COMPONENT_RULES.md): a Tag is a static text label —
// it is not interactive, not focusable, and has no loading, empty, error or
// disabled state of its own. It inherits a disabled host row's treatment.
// Extreme content (truncation with the full label exposed as a title) and all
// three themes are covered below.

const meta: Meta = {
  title: 'Primitives/Tag',
  render: () => el('obra-tag', {}, ['Beta']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const StatusLabels: Story = {
  render: () => row(
    el('obra-tag', {}, ['Active']),
    el('obra-tag', {}, ['Deprecated']),
    el('obra-tag', {}, ['Needs review']),
    el('obra-tag', {}, ['AI suggested'])
  ),
};

/** Tags label text; numbers belong in a Badge (extraction: design/extractions/tag.yaml). */
export const TagVersusBadge: Story = {
  render: () =>
    row(
      el('obra-tag', {}, ['Cost lines']),
      el('obra-badge', {}, ['12']),
      el('span', { style: 'color: var(--obra-text-secondary);' }, [
        'Tag = text label · Badge = count',
      ])
    ),
};

export const InContext: Story = {
  render: () =>
    el('div', { class: 'obra-story-column', style: 'max-width: 46ch;' }, [
      row(
        el('span', {}, ['Infrastructure']),
        el('obra-tag', {}, ['Over budget'])
      ),
      row(
        el('span', {}, ['Design system']),
        el('obra-tag', {}, ['Beta'])
      ),
    ]),
};

export const ExtremeContent: Story = {
  render: () =>
    el('div', { style: 'width: 160px;' }, [
      el('obra-tag', {}, ['Awaiting design reviewer approval']),
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', el('obra-tag', {}, ['Beta'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', el('obra-tag', {}, ['Beta'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', el('obra-tag', {}, ['Beta'])),
};
