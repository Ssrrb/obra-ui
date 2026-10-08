import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const menu = (items: string[], open = true) =>
  el(
    'obra-menu',
    { ...(open ? { open: true } : {}) },
    items.map((item) => el('obra-menu-item', { value: item.toLowerCase() }, [item]))
  );

const meta: Meta = {
  title: 'Primitives/Menu',
  render: () => menu(['New file', 'Rename', 'Duplicate', 'Delete']),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Closed: Story = {
  render: () => menu(['New file', 'Rename', 'Duplicate', 'Delete'], false),
};

export const ManyItems: Story = {
  render: () => menu(Array.from({ length: 24 }, (_, i) => `Action ${i + 1}`)),
};

export const LongItems: Story = {
  render: () =>
    menu([
      'New file',
      'Rename the currently selected file and update every reference to it',
      'Delete the file and move it to the trash instead of removing it permanently',
    ]),
};

export const LightTheme: Story = {
  render: () => themed('light', menu(['New file', 'Rename', 'Duplicate', 'Delete'])),
};

export const DarkTheme: Story = {
  render: () => themed('dark', menu(['New file', 'Rename', 'Duplicate', 'Delete'])),
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', menu(['New file', 'Rename', 'Duplicate', 'Delete'])),
};
