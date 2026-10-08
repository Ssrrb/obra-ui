// Workbench/Regions — every chrome region on its own, for focused design and
// keyboard review without the whole workbench around it. Same tokens and
// behavior as the full replica.

import type { Meta, StoryObj } from '@storybook/web-components';
import {
  activityBar,
  breadcrumbs,
  editorGroup,
  panelRegion,
  sideBarRegion,
  statusBar,
  titleBar,
} from '../src/workbench/workbench.js';
import {
  chatPane,
  companyStatus,
  explorerTree,
  problemsPanel,
  terminalPanel,
} from '../src/workbench/content.js';
import { region } from './_helpers.js';

const meta: Meta = {
  title: 'Workbench/Regions',
  parameters: { layout: 'fullscreen' },
};
export default meta;
type Story = StoryObj<typeof meta>;

export const TitleBar: Story = {
  name: 'Title bar',
  render: () => region('Title bar', titleBar()),
};

export const ActivityBarRegion: Story = {
  name: 'Activity bar',
  render: () => region('Activity bar', activityBar({ labels: false })),
};

export const ActivityBarLabels: Story = {
  name: 'Activity bar with labels',
  render: () => region('Activity bar with labels', activityBar({ labels: true })),
};

export const SideBar: Story = {
  name: 'Primary side bar',
  render: () => region('Primary side bar', sideBarRegion({ children: [explorerTree()] }), 'obra-wb-region__frame--sidebar'),
};

export const EditorTabs: Story = {
  name: 'Editor tabs',
  render: () =>
    region(
      'Editor tabs + breadcrumbs',
      editorGroup({
        tabs: [
          { id: 'budget', label: 'Presupuesto', icon: 'table' },
          { id: 'certificates', label: 'Certificados', icon: 'checklist' },
        ],
        active: 'budget',
        breadcrumbs: ['Edificio Las Palmeras', 'Presupuesto'],
      }),
      'obra-wb-region__frame--column'
    ),
};

export const Breadcrumbs: Story = {
  name: 'Breadcrumbs',
  render: () => region('Breadcrumbs', breadcrumbs(['Edificio Las Palmeras', 'Presupuesto', '02 Estructura'])),
};

export const Panel: Story = {
  name: 'Bottom panel',
  render: () =>
    region(
      'Bottom panel',
      panelRegion({
        active: 'terminal',
        tabs: [
          { id: 'problems', label: 'Problemas', content: problemsPanel() },
          { id: 'terminal', label: 'Terminal', content: terminalPanel() },
        ],
      }),
      'obra-wb-region__frame--column obra-wb-region__frame--panel'
    ),
};

export const StatusBarRegion: Story = {
  name: 'Status bar',
  render: () => region('Status bar', statusBar(companyStatus())),
};

export const Chat: Story = {
  name: 'Chat auxiliary bar',
  render: () => region('Chat auxiliary bar', chatPane('project'), 'obra-wb-region__frame--aux'),
};
