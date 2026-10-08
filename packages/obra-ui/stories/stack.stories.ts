import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const chip = (label: string) => el('obra-badge', {}, [label]);

const stack = (attrs: Record<string, string | boolean>, children = ['One', 'Two', 'Three']) =>
  el(
    'obra-stack',
    attrs,
    children.map((label) => chip(label))
  );

const meta: Meta = {
  title: 'Layouts/Stack',
  render: () => stack({ gap: 'sm' }),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Row: Story = {
  render: () => stack({ gap: 'sm' }),
};

export const Column: Story = {
  render: () => stack({ gap: 'sm', direction: 'column' }),
};

export const Gaps: Story = {
  render: () =>
    el('div', { class: 'obra-story-column' }, [
      stack({ gap: 'none' }),
      stack({ gap: 'xs' }),
      stack({ gap: 'sm' }),
      stack({ gap: 'md' }),
      stack({ gap: 'lg' }),
      stack({ gap: 'xl' }),
    ]),
};

export const ExtremeContent: Story = {
  render: () =>
    stack({ gap: 'sm', direction: 'column' }, Array.from({ length: 30 }, (_, i) => `Item ${i + 1}`)),
};

export const LightTheme: Story = {
  render: () => themed('light', stack({ gap: 'sm' })),
};

export const DarkTheme: Story = {
  render: () => themed('dark', stack({ gap: 'sm' })),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', stack({ gap: 'sm' })),
};
