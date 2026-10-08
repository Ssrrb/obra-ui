// Demo surfaces for the workbench replica.
//
// Copy follows `ui/screens/*.md` (CV-01 Proyectos, PV-00 Explorador, PV-01
// Presupuesto) and the preview renders in `ui/previews/`. Everything here is
// preview content composed from `@obra/ui` components and tokens — never
// product code, never a hand-rolled component.
//
// The DataTable carries per-row render cells (row actions), tree levels
// (rubro → subrubro → línea) and tabular money figures; its states live in
// `Patterns/DataTable`.

import type { DataTableAction, DataTableColumn, DataTableRow, DataTableRowSpec, DataTableStatus } from '@obra/ui';
import { codicon } from './icons.js';
import { tree, type TreeItemSpec } from './tree.js';
import {
  el,
  iconButton,
  statusItem,
  type Child,
  type StatusBarOptions,
} from './workbench.js';

interface DataTableElement extends HTMLElement {
  setData(columns: DataTableColumn[], rows: DataTableRow[], status?: DataTableStatus): void;
}

// --- Explorer ----------------------------------------------------------------

export function explorerEmpty(): HTMLElement {
  return el('obra-empty-state', {
    heading: 'Sin proyecto abierto',
    message: 'Abre un proyecto para ver sus documentos.',
  }, [
    el('span', { slot: 'icon', class: 'obra-wb-explorer-icon' }, [codicon('files', 'obra-wb-icon--xl')]),
  ]);
}

const WORK_UNIT_CHILDREN = [
  'Demoliciones',
  'Movimiento de suelos',
  'Estructura',
  'Albañilería',
  'Instalaciones',
  'Terminaciones',
];

const PARTIDA_CHILDREN = [
  '01 Obras preliminares',
  '02 Estructura',
  '03 Albañilería',
  '04 Instalaciones',
  '05 Terminaciones',
];

export const EXPLORER_ITEMS: TreeItemSpec[] = [
  {
    id: 'obra',
    label: 'Edificio Las Palmeras',
    icon: 'rootFolder',
    expanded: true,
    children: [
      { id: 'budget', label: 'Presupuesto', icon: 'table', selected: true },
      {
        id: 'work-units',
        label: 'Unidades de trabajo',
        icon: 'tools',
        expanded: true,
        children: WORK_UNIT_CHILDREN.map((label, index) => ({ id: `work-unit-${index}`, label })),
      },
      {
        id: 'partidas',
        label: 'Partidas',
        icon: 'folder',
        expanded: true,
        children: PARTIDA_CHILDREN.map((label, index) => ({ id: `partida-${index}`, label })),
      },
      { id: 'orders', label: 'Órdenes de compra', icon: 'package' },
      { id: 'contracts', label: 'Contratos', icon: 'law' },
      { id: 'certificates', label: 'Certificados', icon: 'checklist' },
      { id: 'payments', label: 'Pagos', icon: 'creditCard' },
      { id: 'collections', label: 'Cobros', icon: 'graphLine' },
      { id: 'inputs', label: 'Insumos', icon: 'database' },
      { id: 'clients', label: 'Clientes', icon: 'person' },
      { id: 'partners', label: 'Socios', icon: 'organization' },
      { id: 'attachments', label: 'Adjuntos', icon: 'attach' },
    ],
  },
];

export function explorerTree(): HTMLElement {
  return tree({ label: 'Explorador', items: EXPLORER_ITEMS });
}

// --- Editor neutral state ----------------------------------------------------

export function editorNeutral(message = 'Abre un documento del árbol para empezar.'): HTMLElement {
  return el('div', { class: 'obra-wb-editor-neutral' }, [
    el('obra-empty-state', { heading: 'Obra Studio', message }),
  ]);
}

// --- Shared surface pieces ---------------------------------------------------

function surfaceHeader(title: string, subtitle: string | null, actions: Child[]): HTMLElement {
  const titleBlock = el('div', { class: 'obra-wb-surface__titleblock' }, [
    el('h1', { class: 'obra-wb-surface__title' }, [title]),
  ]);
  if (subtitle) titleBlock.append(el('p', { class: 'obra-wb-surface__subtitle' }, [subtitle]));
  return el('header', { class: 'obra-wb-surface__header' }, [
    titleBlock,
    el('div', { class: 'obra-wb-surface__actions' }, actions),
  ]);
}

function searchField(placeholder: string): HTMLElement {
  return el('div', { class: 'obra-wb-search' }, [
    codicon('search'),
    el('obra-text-field', {
      type: 'search',
      placeholder,
      'aria-label': placeholder,
    }),
  ]);
}

function loadingState(label: string): HTMLElement {
  return el('obra-loading-state', { label });
}

function errorState(heading: string, message: string): HTMLElement {
  const state = el('obra-error-state', { heading, message });
  const retry = el('obra-button', { slot: 'actions', variant: 'secondary' }, ['Reintentar']);
  state.append(retry);
  return state;
}

// --- Company view · CV-01 Proyectos ------------------------------------------

export type ProjectListState = 'ready' | 'loading' | 'empty' | 'error' | 'no-results';

const PROJECT_COLUMNS: DataTableColumn[] = [
  { key: 'project', header: 'Proyecto' },
  { key: 'state', header: 'Estado' },
  { key: 'currency', header: 'Moneda' },
  { key: 'activity', header: 'Última actividad' },
];

const ACTIVE_PROJECTS = [
  { project: 'Edificio Las Palmeras', state: 'Activo', currency: 'PYG', activity: 'Hoy' },
  { project: 'Vivienda San Lorenzo', state: 'Activo', currency: 'PYG', activity: 'Ayer' },
  { project: 'Oficinas Villa Morra', state: 'Activo', currency: 'USD', activity: 'Hace 2 días' },
];

const FINISHED_PROJECTS = [
  { project: 'Complejo Ñu Guasu', state: 'Terminado', currency: 'PYG', activity: 'Hace 3 meses' },
];

/** CV-01 row actions: open, plus the state change its menu offers (L3-35). */
function projectActions(finished: boolean): DataTableAction[] {
  return [
    { id: 'open', label: 'Abrir' },
    {
      id: 'more',
      label: 'Más acciones',
      kind: 'menu',
      items: [
        { id: 'open', label: 'Abrir' },
        { id: finished ? 'reactivate' : 'finish', label: finished ? 'Marcar como activo' : 'Marcar como terminado' },
      ],
    },
  ];
}

function projectsTable(rows: Record<string, string>[], label: string, finished = false): DataTableElement {
  const table = el('obra-data-table', { 'aria-label': label }) as DataTableElement;
  table.setData(
    [
      ...PROJECT_COLUMNS,
      { key: 'actions', header: '', headerLabel: 'Acciones', align: 'end', actions: () => projectActions(finished) },
    ],
    rows
  );
  return table;
}

export function companyProjectsEditor(state: ProjectListState = 'ready'): HTMLElement {
  const surface = el('div', { class: 'obra-wb-surface' });
  surface.append(
    surfaceHeader('Proyectos', '3 en curso · 1 terminados', [
      el('obra-button', {}, ['Crear proyecto']),
    ])
  );

  if (state === 'loading') {
    surface.append(loadingState('Cargando proyectos…'));
    return surface;
  }
  if (state === 'error') {
    surface.append(errorState('No se pudieron cargar los proyectos', 'La lista de proyectos no está disponible.'));
    return surface;
  }
  if (state === 'empty') {
    const empty = el('obra-empty-state', {
      heading: 'Todavía no hay proyectos',
      message: 'Un proyecto agrupa el presupuesto, los certificados y los pagos de una obra.',
    });
    empty.append(el('obra-button', { slot: 'actions' }, ['Crear proyecto']));
    surface.append(empty);
    return surface;
  }
  if (state === 'no-results') {
    const empty = el('obra-empty-state', {
      heading: 'Sin resultados para «palmeras»',
      message: 'Probá con otro nombre o limpiá la búsqueda.',
    });
    empty.append(el('obra-button', { slot: 'actions', variant: 'secondary' }, ['Limpiar búsqueda']));
    surface.append(searchField('Buscar proyectos'), empty);
    return surface;
  }

  const activePanel = el('obra-tab-panel', { for: 'active' }, [
    searchField('Buscar proyectos'),
    projectsTable(ACTIVE_PROJECTS, 'Proyectos en curso'),
  ]);
  const finishedPanel = el('obra-tab-panel', { for: 'finished' }, [
    projectsTable(FINISHED_PROJECTS, 'Proyectos terminados', true),
  ]);
  surface.append(
    el('obra-tabs', { active: 'active' }, [
      el('obra-tab', { id: 'active', slot: 'tab' }, ['En curso']),
      el('obra-tab', { id: 'finished', slot: 'tab' }, ['Terminados']),
      activePanel,
      finishedPanel,
    ])
  );
  return surface;
}

// --- Project view · PV-01 Presupuesto ----------------------------------------

export type BudgetState = 'ready' | 'loading' | 'error';

const BUDGET_COLUMNS: DataTableColumn[] = [
  { key: 'code', header: 'Código' },
  { key: 'description', header: 'Descripción' },
  { key: 'unit', header: 'Unidad de medida' },
  { key: 'quantity', header: 'Cantidad', align: 'end', figures: 'tabular' },
  { key: 'unitPrice', header: 'Precio unitario (PYG)', align: 'end', figures: 'tabular' },
  { key: 'amount', header: 'Monto (PYG)', align: 'end', figures: 'tabular' },
];

// Rubros (level 0, bold) with their líneas (level 1). A subrubro would sit at
// level 2; PV-01 shows the container levels it has data for.
const BUDGET_ROWS: DataTableRow[] = [
  { values: { code: '01', description: 'Obras preliminares', amount: '6.300.000,00' }, emphasis: 'group' },
  { values: { code: '01.01', description: 'Limpieza del terreno', unit: 'm²', quantity: '120,00', unitPrice: '35.000,00', amount: '4.200.000,00' }, level: 1 },
  { values: { code: '01.02', description: 'Replanteo', unit: 'm²', quantity: '120,00', unitPrice: '17.500,00', amount: '2.100.000,00' }, level: 1 },
  { values: { code: '02', description: 'Estructura', amount: '101.000.000,00' }, emphasis: 'group' },
  { values: { code: '02.01', description: 'Hormigón armado', unit: 'm³', quantity: '200,00', unitPrice: '320.000,00', amount: '64.000.000,00' }, level: 1 },
  { values: { code: '02.02', description: 'Acero de refuerzo', unit: 'kg', quantity: '10.000,00', unitPrice: '3.700,00', amount: '37.000.000,00' }, level: 1 },
];

const CONTROL_COLUMNS: DataTableColumn[] = [
  { key: 'code', header: 'Código' },
  { key: 'description', header: 'Descripción' },
  { key: 'budget', header: 'Presupuesto (PYG)', align: 'end', figures: 'tabular' },
  { key: 'committed', header: 'Comprometido (PYG)', align: 'end', figures: 'tabular' },
  { key: 'executed', header: 'Ejecutado (PYG)', align: 'end', figures: 'tabular' },
  { key: 'measured', header: 'Medido (PYG)', align: 'end', figures: 'tabular' },
  { key: 'available', header: 'Disponible (PYG)', align: 'end', figures: 'tabular' },
];

const CONTROL_ROWS: DataTableRowSpec[] = [
  { values: { code: '01', description: 'Obras preliminares', budget: '6.300.000,00', committed: '5.000.000,00', executed: '2.800.000,00', measured: '2.800.000,00', available: '3.500.000,00' }, emphasis: 'group' },
  { values: { code: '02', description: 'Estructura', budget: '101.000.000,00', committed: '78.000.000,00', executed: '32.500.000,00', measured: '30.000.000,00', available: '23.000.000,00' }, emphasis: 'group' },
  { values: { code: '', description: 'Total', budget: '107.300.000,00', committed: '83.000.000,00', executed: '35.300.000,00', measured: '32.800.000,00', available: '26.500.000,00' }, emphasis: 'total' },
];

function budgetToolbar(): HTMLElement {
  return el('div', { class: 'obra-wb-surface__actions' }, [
    el('span', { class: 'obra-wb-currency' }, [
      el('obra-select', { value: 'PYG', 'aria-label': 'Moneda' }, [
        el('obra-option', { value: 'PYG' }, ['PYG']),
        el('obra-option', { value: 'USD' }, ['USD']),
      ]),
    ]),
    el('obra-button', {}, [codicon('add'), 'Agregar línea']),
    el('obra-button', { variant: 'secondary' }, [codicon('cloudDownload'), 'Importar']),
    el('obra-button', { variant: 'secondary' }, [codicon('filePdf'), 'Imprimir']),
    iconButton('ellipsis', 'Más acciones'),
  ]);
}

function budgetTable(): DataTableElement {
  const table = el('obra-data-table', { 'aria-label': 'Presupuesto' }) as DataTableElement;
  table.setData(BUDGET_COLUMNS, BUDGET_ROWS);
  return table;
}

function budgetSummary(): HTMLElement {
  return el('div', { class: 'obra-wb-summary' }, [
    el('obra-property-row', { label: 'Costo directo (PYG)', value: '107.300.000,00' }),
    el('obra-property-row', { label: 'Indirectos totales (10,00 %)', value: '10.730.000,00' }),
    el('obra-property-row', { label: 'Monto del contrato (PYG)', value: '118.030.000,00' }),
  ]);
}

function controlTable(overcommitment: boolean): HTMLElement {
  const rows = overcommitment
    ? CONTROL_ROWS.map((row) =>
        String(row.values.code) === '01'
          ? { ...row, values: { ...row.values, available: '-2.500.000,00', description: 'Obras preliminares · Sobrecompromiso' } }
          : row
      )
    : CONTROL_ROWS;
  const table = el('obra-data-table', { 'aria-label': 'Control presupuestario por capítulo' }) as DataTableElement;
  table.setData(CONTROL_COLUMNS, rows);
  return el('section', { class: 'obra-wb-subsection' }, [
    el('h2', { class: 'obra-wb-subsection__title' }, ['Control presupuestario por capítulo']),
    table,
  ]);
}

export function projectBudgetEditor(
  state: BudgetState = 'ready',
  options: { overcommitment?: boolean } = {}
): HTMLElement {
  const surface = el('div', { class: 'obra-wb-surface' });
  surface.append(surfaceHeader('Presupuesto', null, [budgetToolbar()]));

  if (state === 'loading') {
    surface.append(loadingState('Cargando el presupuesto…'));
    return surface;
  }
  if (state === 'error') {
    surface.append(errorState('No se pudo calcular el presupuesto', 'El motor de cálculo no respondió. Los datos legibles se conservan.'));
    return surface;
  }

  surface.append(budgetTable(), budgetSummary(), controlTable(!!options.overcommitment));
  return surface;
}

export function certificatesEditor(): HTMLElement {
  const surface = el('div', { class: 'obra-wb-surface' });
  surface.append(surfaceHeader('Certificados', null, [el('obra-button', {}, ['Nuevo certificado'])]));
  const empty = el('obra-empty-state', {
    heading: 'Sin certificados emitidos',
    message: 'Los certificados de avance del proyecto aparecen acá.',
  });
  surface.append(empty);
  return surface;
}

// --- Panel content -----------------------------------------------------------

export function terminalPanel(): HTMLElement {
  return el('div', { class: 'obra-wb-terminal' }, [
    el('p', {}, [
      el('span', { class: 'obra-wb-terminal__prompt' }, ['obra@studio']),
      el('span', { class: 'obra-wb-terminal__path' }, [' ~ % ']),
      'pnpm obra:launch',
    ]),
    el('p', { class: 'obra-wb-terminal__muted' }, ['[obra-studio] extensión activa · 3 proyectos · 1 obra abierta']),
    el('p', {}, [
      el('span', { class: 'obra-wb-terminal__prompt' }, ['obra@studio']),
      el('span', { class: 'obra-wb-terminal__path' }, [' ~ % ']),
      el('span', { class: 'obra-wb-terminal__cursor' }),
    ]),
  ]);
}

export function problemsPanel(): HTMLElement {
  return el('div', { class: 'obra-wb-panel-empty' }, [
    codicon('check', 'obra-wb-icon--sm'),
    el('span', {}, ['No hay problemas en el espacio de trabajo']),
  ]);
}

// --- Chat --------------------------------------------------------------------

export function chatPane(variant: 'company' | 'project' = 'company'): HTMLElement {
  const copy =
    variant === 'company'
      ? {
          title: 'Aún no hay conversaciones',
          body: 'Haz preguntas sobre tus proyectos, documentos o presupuestos.',
        }
      : {
          title: 'Pregunta sobre tu proyecto',
          body: 'Puedo ayudarte con el presupuesto, certificados, contratos o cualquier aspecto de la obra.',
        };

  return el('div', { class: 'obra-wb-chat' }, [
    el('div', { class: 'obra-wb-chat__empty' }, [
      codicon('commentDiscussion', 'obra-wb-icon--xl'),
      el('p', { class: 'obra-wb-chat__empty-title' }, [copy.title]),
      el('p', { class: 'obra-wb-chat__empty-body' }, [copy.body]),
    ]),
    el('div', { class: 'obra-wb-chat__composer' }, [
      el('div', { class: 'obra-wb-chat__box' }, [
        el('obra-text-area', {
          placeholder: 'Escribe un mensaje…',
          rows: 1,
          'aria-label': 'Escribe un mensaje',
        }),
        iconButton('send', 'Enviar mensaje', 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
      ]),
      el('div', { class: 'obra-wb-chat__meta' }, [
        iconButton('attach', 'Adjuntar archivo', 'obra-wb-iconbtn obra-wb-iconbtn--sm'),
        el('button', { type: 'button', class: 'obra-wb-chip' }, [
          codicon('file', 'obra-wb-icon--sm'),
          'Proyecto actual',
          codicon('chevronDown', 'obra-wb-icon--sm'),
        ]),
      ]),
    ]),
  ]);
}

// --- Status bars -------------------------------------------------------------

export function companyStatus(): StatusBarOptions {
  return {
    left: [
      statusItem('Obra Studio', 'code'),
      statusItem('main', 'gitBranch', 'chevronDown', 'Rama: main'),
      statusItem('', 'sync', undefined, 'Sincronizar cambios'),
    ],
    right: [
      statusItem('UTF-8'),
      statusItem('LF'),
      statusItem('Obra Studio'),
      statusItem('', 'bell', undefined, 'Notificaciones'),
    ],
  };
}

export function projectStatus(): StatusBarOptions {
  return {
    left: [
      statusItem('Obra Studio', 'code'),
      statusItem('main', 'gitBranch', 'chevronDown', 'Rama: main'),
      statusItem('', 'sync', undefined, 'Sincronizar cambios'),
    ],
    right: [
      statusItem('PYG'),
      statusItem('UTF-8'),
      statusItem('LF'),
      statusItem('Obra'),
      statusItem('', 'bell', undefined, 'Notificaciones'),
    ],
  };
}
