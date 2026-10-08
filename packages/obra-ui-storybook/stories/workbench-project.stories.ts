// Workbench/Project — the project view assembled inside the workbench replica.
// PV-00 Explorador + PV-01 Presupuesto per `ui/screens/project/*.md` and the
// project preview: project explorer tree, editor tabs (Presupuesto,
// Certificados), breadcrumbs, budget grid, Chat auxiliary bar, status bar.

import type { Meta, StoryObj } from '@storybook/web-components';
import {
  ACTIVITY_FOOTER,
  PROJECT_ACTIVITY,
  type WorkbenchOptions,
} from '../src/workbench/workbench.js';
import {
  certificatesEditor,
  chatPane,
  explorerTree,
  projectBudgetEditor,
  projectStatus,
  type BudgetState,
} from '../src/workbench/content.js';
import { full } from './_helpers.js';

const projectView = (
  state: BudgetState,
  options: { overcommitment?: boolean; activeTab?: string } = {}
): WorkbenchOptions => ({
  activity: PROJECT_ACTIVITY,
  activeActivity: 'explorer',
  activityFooter: ACTIVITY_FOOTER,
  sidebar: explorerTree(),
  tabs: [
    {
      id: 'budget',
      label: 'Presupuesto',
      icon: 'table',
      content: projectBudgetEditor(state, { overcommitment: options.overcommitment }),
    },
    {
      id: 'certificates',
      label: 'Certificados',
      icon: 'checklist',
      content: certificatesEditor(),
    },
  ],
  activeTab: options.activeTab ?? 'budget',
  breadcrumbs: ['Edificio Las Palmeras', 'Presupuesto'],
  auxiliary: chatPane('project'),
  statusLeft: projectStatus().left,
  statusRight: projectStatus().right,
});

const meta: Meta = {
  title: 'Workbench/Project',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Budget: Story = {
  render: () => full(projectView('ready')),
};

export const Overcommitment: Story = {
  render: () => full(projectView('ready', { overcommitment: true })),
};

export const Certificates: Story = {
  render: () => full(projectView('ready', { activeTab: 'certificates' })),
};

export const Loading: Story = {
  render: () => full(projectView('loading')),
};

export const EngineError: Story = {
  name: 'Engine error',
  render: () => full(projectView('error')),
};
