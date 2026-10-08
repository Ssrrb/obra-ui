// Workbench/Company — the company view assembled inside the workbench replica.
// CV-01 Proyectos per `ui/screens/company/projects.md` and the company preview:
// activity bar (Proyectos), empty project explorer, projects editor, Chat
// auxiliary bar, status bar. Every state the screen defines is a story.

import type { Meta, StoryObj } from '@storybook/web-components';
import {
  ACTIVITY_FOOTER,
  COMPANY_ACTIVITY,
  type WorkbenchOptions,
} from '../src/workbench/workbench.js';
import {
  chatPane,
  companyProjectsEditor,
  companyStatus,
  explorerEmpty,
  type ProjectListState,
} from '../src/workbench/content.js';
import { full } from './_helpers.js';

const companyView = (state: ProjectListState): WorkbenchOptions => ({
  activity: COMPANY_ACTIVITY,
  activeActivity: 'projects',
  activityFooter: ACTIVITY_FOOTER,
  sidebar: explorerEmpty(),
  tabs: [
    {
      id: 'projects',
      label: 'Proyectos',
      icon: 'project',
      content: companyProjectsEditor(state),
    },
  ],
  auxiliary: chatPane('company'),
  statusLeft: companyStatus().left,
  statusRight: companyStatus().right,
});

const meta: Meta = {
  title: 'Workbench/Company',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Projects: Story = {
  render: () => full(companyView('ready')),
};

export const Loading: Story = {
  render: () => full(companyView('loading')),
};

export const Empty: Story = {
  render: () => full(companyView('empty')),
};

export const Error: Story = {
  render: () => full(companyView('error')),
};

export const NoResults: Story = {
  name: 'Search without results',
  render: () => full(companyView('no-results')),
};
