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
  budgetItemExceededNote,
  budgetItemSelect,
  certificatesEditor,
  chatPane,
  explorerTree,
  projectBudgetEditor,
  projectStatus,
  type BudgetState,
} from '../src/workbench/content.js';
import {
  projectBudgetImportEditor,
  type BudgetImportStep,
  type BudgetImportVariant,
} from '../src/workbench/budget-import.js';
import { el } from '../src/workbench/workbench.js';
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
      id: 'budget-import',
      label: 'Importar presupuesto',
      icon: 'cloudDownload',
      content: projectBudgetImportEditor('source'),
    },
    {
      id: 'certificates',
      label: 'Certificados',
      icon: 'checklist',
      content: certificatesEditor(),
    },
  ],
  activeTab: options.activeTab ?? 'budget',
  breadcrumbs: ['Edificio Las Palmeras', 'Presupuesto', ...(options.activeTab === 'budget-import' ? ['Importar'] : [])],
  auxiliary: chatPane('project'),
  statusLeft: projectStatus().left,
  statusRight: projectStatus().right,
});

const importView = (step: BudgetImportStep, variant: BudgetImportVariant = 'balanced'): WorkbenchOptions => ({
  activity: PROJECT_ACTIVITY,
  activeActivity: 'explorer',
  activityFooter: ACTIVITY_FOOTER,
  sidebar: explorerTree(),
  tabs: [
    {
      id: 'budget',
      label: 'Presupuesto',
      icon: 'table',
      content: projectBudgetEditor('ready'),
    },
    {
      id: 'budget-import',
      label: 'Importar presupuesto',
      icon: 'cloudDownload',
      content: projectBudgetImportEditor(step, { variant }),
    },
  ],
  activeTab: 'budget-import',
  breadcrumbs: ['Edificio Las Palmeras', 'Presupuesto', 'Importar'],
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

export const BudgetImportSource: Story = {
  name: 'Budget import · Source',
  render: () => full(projectView('ready', { activeTab: 'budget-import' })),
};

export const BudgetImportStructure: Story = {
  name: 'Budget import · Structure',
  render: () => full(importView('structure')),
};

export const BudgetImportReview: Story = {
  name: 'Budget import · Review',
  render: () => full(importView('review')),
};

export const BudgetImportReviewNoBalance: Story = {
  name: 'Budget import · Review · No cuadra',
  render: () => full(importView('review', 'unbalanced')),
};

export const BudgetImportConfirm: Story = {
  name: 'Budget import · Confirm',
  render: () => full(importView('confirm')),
};

export const BudgetImportConfirmNoBalance: Story = {
  name: 'Budget import · Confirm · No cuadra',
  render: () => full(importView('confirm', 'unbalanced')),
};

export const BudgetImportResult: Story = {
  name: 'Budget import · Result',
  render: () => full(importView('result')),
};

export const BudgetItemSelect: Story = {
  name: 'Budget item select',
  render: () =>
    full({
      activity: PROJECT_ACTIVITY,
      activeActivity: 'explorer',
      activityFooter: ACTIVITY_FOOTER,
      sidebar: explorerTree(),
      tabs: [
        {
          id: 'select-demo',
          label: 'Presupuesto',
          icon: 'table',
          content: el('div', { class: 'obra-wb-surface' }, [
            el('header', { class: 'obra-wb-surface__header' }, [
              el('div', { class: 'obra-wb-surface__titleblock' }, [
                el('h1', { class: 'obra-wb-surface__title' }, ['Imputación de partida']),
                el('p', { class: 'obra-wb-surface__subtitle' }, [
                  'Selector de rubro de destino para OC, pedidos y caja chica. Solo partidas hoja, con su saldo; Gastos Generales al final.',
                ]),
              ]),
            ]),
            el('div', { class: 'obra-wb-surface__actions' }, [budgetItemSelect({ selected: '02.01' })]),
            budgetItemExceededNote('2.500.000,00'),
          ]),
        },
      ],
      activeTab: 'select-demo',
      breadcrumbs: ['Edificio Las Palmeras', 'Presupuesto', 'Imputación'],
      auxiliary: chatPane('project'),
      statusLeft: projectStatus().left,
      statusRight: projectStatus().right,
    }),
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
