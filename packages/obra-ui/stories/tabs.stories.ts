import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const tabs = (labels: string[], activeIndex = 0) => {
  const children = labels.map((label, i) => {
    const id = `tab-${i}`;
    return [
      el('obra-tab', { id, slot: 'tab' }, [label]),
      el('obra-tab-panel', { for: id, hidden: i !== activeIndex }, [`Panel content for ${label}`]),
    ];
  });
  return el('obra-tabs', { active: `tab-${activeIndex}` }, children.flat());
};

const meta: Meta = {
  title: 'Primitives/Tabs',
  render: () => tabs(['Overview', 'Activity', 'Settings']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const SecondActive: Story = {
  render: () => tabs(['Overview', 'Activity', 'Settings'], 1),
};

export const ManyTabs: Story = {
  render: () => tabs(Array.from({ length: 12 }, (_, i) => `Tab ${i + 1}`), 5),
};

export const LongLabels: Story = {
  render: () =>
    tabs([
      'Overview and recent activity across every connected workspace',
      'Configuration, secrets, and environment variables',
      'Historical runs and their detailed logs',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', tabs(['Overview', 'Activity', 'Settings'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', tabs(['Overview', 'Activity', 'Settings'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', tabs(['Overview', 'Activity', 'Settings'])),
};
