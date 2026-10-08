// Workbench/Shell — the VS Code workbench replica with no product surface in
// the editor. This is the base canvas for UI & UX testing: regions, states and
// themes, with the toolbar theme switcher driving light / dark / high contrast.
//
// Preview-only (design/PRINCIPLES.md rule 10): important workflows still run in
// the real Code OSS host.

import type { Meta, StoryObj } from '@storybook/web-components';
import {
  ACTIVITY_FOOTER,
  COMPANY_ACTIVITY,
  PROJECT_ACTIVITY,
  type WorkbenchOptions,
} from '../src/workbench/workbench.js';
import {
  chatPane,
  companyStatus,
  editorNeutral,
  explorerEmpty,
  explorerTree,
  problemsPanel,
  projectStatus,
  terminalPanel,
} from '../src/workbench/content.js';
import { full } from './_helpers.js';

const companyShell = (): WorkbenchOptions => ({
  activity: COMPANY_ACTIVITY,
  activeActivity: 'projects',
  activityFooter: ACTIVITY_FOOTER,
  sidebar: explorerEmpty(),
  editor: editorNeutral('Abre un proyecto para ver sus documentos.'),
  statusLeft: companyStatus().left,
  statusRight: companyStatus().right,
});

const meta: Meta = {
  title: 'Workbench/Shell',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const Default: Story = {
  render: () => full(companyShell()),
};

export const ActivityLabels: Story = {
  name: 'Activity bar with labels',
  render: () => full({ ...companyShell(), activityLabels: true }),
};

export const WithPanel: Story = {
  render: () =>
    full({
      ...companyShell(),
      panel: {
        active: 'terminal',
        tabs: [
          { id: 'problems', label: 'Problemas', content: problemsPanel() },
          { id: 'terminal', label: 'Terminal', content: terminalPanel() },
        ],
      },
    }),
};

export const WithChat: Story = {
  render: () =>
    full({
      ...companyShell(),
      auxiliary: chatPane('company'),
    }),
};

export const ProjectShell: Story = {
  render: () =>
    full({
      activity: PROJECT_ACTIVITY,
      activeActivity: 'explorer',
      activityFooter: ACTIVITY_FOOTER,
      sidebar: explorerTree(),
      editor: editorNeutral(),
      statusLeft: projectStatus().left,
      statusRight: projectStatus().right,
    }),
};

export const LightTheme: Story = {
  render: () => full(companyShell(), 'light'),
};

export const DarkTheme: Story = {
  render: () => full(companyShell(), 'dark'),
};

export const HighContrast: Story = {
  render: () => full(companyShell(), 'high-contrast'),
};
