import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

type DialogElement = HTMLElement & { open(): void };

const dialog = (
  attrs: Record<string, string | boolean> = {},
  message = 'This action cannot be undone.'
) => el('obra-confirmation-dialog', { heading: 'Delete project', message, ...attrs });

const openDialog = async (context: { canvasElement: HTMLElement }): Promise<void> => {
  const host = context.canvasElement.querySelector('obra-confirmation-dialog') as DialogElement | null;
  host?.open();
};

const meta: Meta = {
  title: 'Patterns/ConfirmationDialog',
  render: () => dialog(),
  play: openDialog,
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const Danger: Story = {
  render: () => dialog({ danger: true, 'confirm-label': 'Delete', 'cancel-label': 'Keep' }),
};

export const ExtremeContent: Story = {
  render: () =>
    dialog(
      { danger: true, 'confirm-label': 'Delete permanently' },
      'Deleting this project removes every deployment, environment variable, secret, build cache, and audit record attached to it. Connected repositories will keep their files, but nothing here can be restored.'
    ),
};

export const Closed: Story = {
  render: () => el('div', {}, ['The dialog is closed until the host calls .open().']),
};

export const LightTheme: Story = {
  render: () => themed('light', dialog({ danger: true })),
  play: openDialog,
};

export const DarkTheme: Story = {
  render: () => themed('dark', dialog({ danger: true })),
  play: openDialog,
};

export const HighContrast: Story = {
  render: () => themed('high-contrast', dialog({ danger: true })),
  play: openDialog,
};
