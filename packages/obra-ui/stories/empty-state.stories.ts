import type { Meta, StoryObj } from '@storybook/web-components-vite';
import { el, themed } from './_dom';

const empty = (heading: string, message: string, withAction = false) =>
  el('obra-empty-state', { heading, message }, [
    ...(withAction ? [el('obra-button', { variant: 'primary', slot: 'actions' }, ['New project'])] : []),
  ]);

const meta: Meta = {
  title: 'Patterns/EmptyState',
  render: () => empty('No projects yet', 'Create your first project to get started.'),
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {};

export const WithAction: Story = {
  render: () => empty('No projects yet', 'Create your first project to get started.', true),
};

export const ExtremeContent: Story = {
  render: () =>
    empty(
      'No projects are visible in this workspace',
      'Every project in this workspace is archived or belongs to another organization. Switch organizations, restore an archived project, or create a new one to see it here.',
      true
    ),
};

export const LightTheme: Story = {
  render: () => themed('light', empty('No projects yet', 'Create your first project to get started.')),
};

export const DarkTheme: Story = {
  render: () => themed('dark', empty('No projects yet', 'Create your first project to get started.')),
};

export const HighContrast: Story = {
  render: () =>
    themed('high-contrast', empty('No projects yet', 'Create your first project to get started.')),
};
