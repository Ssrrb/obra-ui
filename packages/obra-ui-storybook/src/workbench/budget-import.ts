// PV-01 · Importar presupuesto — the four-step import wizard ported from
// SISTEMA-DE-CONTROL-OBRAS ExcelBudgetImporter (React/Tailwind) to workbench
// surfaces composed from `@obra/ui` primitives and tokens.
//
// Copy keeps the source's Spanish wording (voseo); the step names, the column
// roles, the row kinds and the surcharge treatments come from the budget
// engine (`src/workbench/modules/budgets/engine/`), whose values this static
// preview mirrors: 2 ítems (1.000.000) + G.G. 15 % (150.000) + IVA 10 %
// (115.000) → total 1.265.000 · presupuesto de control 1.150.000 · cuadra.
//
// Demo-only. Live wiring against the engine stays with the product surface.

import type { DataTableColumn, DataTableRow } from '@obra/ui';
import { codicon } from './icons.js';
import { el, type Child } from './workbench.js';

interface DataTableElement extends HTMLElement {
  setData(columns: DataTableColumn[], rows: DataTableRow[], status?: string): void;
}

export type BudgetImportStep = 'source' | 'structure' | 'review' | 'confirm' | 'result';
export type BudgetImportVariant = 'balanced' | 'unbalanced';

const STEPS = ['Carga', 'Estructura', 'Revisión y cuadre', 'Confirmar'];

const SUFFIX_STEP: Record<BudgetImportStep, number> = {
  source: 1,
  structure: 2,
  review: 3,
  confirm: 4,
  result: 4,
};

const ROLE_OPTIONS: [string, string][] = [
  ['code', 'Código / Ítem'],
  ['description', 'Descripción'],
  ['unit', 'Unidad'],
  ['quantity', 'Cantidad'],
  ['unitPrice', 'Precio unitario'],
  ['totalPrice', 'Precio total'],
  ['ignore', 'Ignorar'],
];

const KIND_LABELS: Record<string, string> = {
  RUBRO: 'Rubro',
  SUBRUBRO: 'Subrubro',
  ITEM: 'Ítem',
  SUBTOTAL: 'Subtotal',
  RECARGO: 'Recargo',
  IGNORAR: 'Ignorar',
};

const TREATMENT_OPTIONS: [string, string][] = [
  ['DISTRIBUTE', 'Prorratear en los PU'],
  ['AS_ITEM', 'Partida propia'],
  ['IGNORE', 'No cargar'],
];

interface DemoSheet {
  name: string;
  items: number;
  summary: boolean;
  selected: boolean;
}

const DEMO_SHEETS: DemoSheet[] = [
  { name: 'Presupuesto', items: 18, summary: false, selected: true },
  { name: 'Resumen', items: 0, summary: true, selected: false },
];

interface DemoColumn {
  letter: string;
  header: string;
  role: string;
  samples: string;
}

const DEMO_COLUMNS: DemoColumn[] = [
  { letter: 'A', header: 'Item', role: 'code', samples: '1 · 1.1 · 1.2' },
  { letter: 'B', header: 'Descripción', role: 'description', samples: 'FUNDACIONES · Trabajo A' },
  { letter: 'C', header: 'Unidad', role: 'unit', samples: 'gl · un' },
  { letter: 'D', header: 'Cantidad', role: 'quantity', samples: '1 · 10' },
  { letter: 'E', header: 'Precio Unitario', role: 'unitPrice', samples: '600.000 · 400.000' },
  { letter: 'F', header: 'Precio Total', role: 'totalPrice', samples: '600.000 · 500.000' },
];

interface DemoRow {
  rowNumber: string;
  kind: keyof typeof KIND_LABELS;
  level: number;
  code: string;
  description: string;
  unit: string;
  quantity: string;
  unitPrice: string;
  totalPrice: string;
  amountLoaded: string;
}

const DEMO_ROWS: DemoRow[] = [
  { rowNumber: '2', kind: 'RUBRO', level: 0, code: '1', description: 'RUBRO ÚNICO', unit: '', quantity: '', unitPrice: '', totalPrice: '', amountLoaded: '' },
  { rowNumber: '3', kind: 'SUBRUBRO', level: 1, code: '1.1', description: 'FUNDACIONES', unit: '', quantity: '', unitPrice: '', totalPrice: '', amountLoaded: '' },
  { rowNumber: '4', kind: 'ITEM', level: 2, code: '1.1.1', description: 'Trabajo A', unit: 'gl', quantity: '1', unitPrice: '600.000,00', totalPrice: '600.000,00', amountLoaded: '690.000,00' },
  { rowNumber: '5', kind: 'ITEM', level: 2, code: '1.1.2', description: 'Trabajo B', unit: 'gl', quantity: '1', unitPrice: '400.000,00', totalPrice: '400.000,00', amountLoaded: '460.000,00' },
  { rowNumber: '6', kind: 'RECARGO', level: 0, code: '', description: 'Gastos generales y beneficio 15 %', unit: '', quantity: '', unitPrice: '', totalPrice: '', amountLoaded: '150.000,00' },
  { rowNumber: '7', kind: 'RECARGO', level: 0, code: '', description: 'IVA 10 %', unit: '', quantity: '', unitPrice: '', totalPrice: '', amountLoaded: '115.000,00' },
  { rowNumber: '8', kind: 'SUBTOTAL', level: 0, code: '', description: 'TOTAL GENERAL', unit: '', quantity: '', unitPrice: '', totalPrice: '1.265.000,00', amountLoaded: '' },
];

const DEMO_TOTALS = {
  itemsTotal: '1.000.000,00',
  sheetComputedTotal: '1.265.000,00',
  declaredGrandTotal: '1.265.000,00',
  budgetTotal: '1.150.000,00',
};

// --- Building blocks ----------------------------------------------------------

function select(options: [string, string][], value: string, label: string): HTMLElement {
  return el(
    'obra-select',
    { value, 'aria-label': label },
    options.map(([v, text]) => el('obra-option', { value: v }, [text])),
  );
}

function checkbox(checked: boolean, text: string): HTMLElement {
  // Own wrapper row: keeps the control floated beside its label regardless of
  // the custom element's upgrade timing; the text stays inside the element as
  // its accessible name.
  return el('div', { class: 'obra-wb-option' }, [
    el('obra-checkbox', checked ? { checked: '' } : {}, [text]),
  ]);
}

function optionRow(radio: HTMLElement): HTMLElement {
  return el('div', { class: 'obra-wb-option' }, [radio]);
}

function stepsStrip(current: number): HTMLElement {
  return el(
    'div',
    { class: 'obra-wb-steps', role: 'group', 'aria-label': 'Pasos de la importación' },
    STEPS.map((label, i) => {
      const state = i + 1 === current ? 'current' : i + 1 < current ? 'done' : 'pending';
      const marker: Child[] = [
        el('span', { class: 'obra-wb-step__num' }, [String(i + 1)]),
        label,
      ];
      return el('div', { class: `obra-wb-step obra-wb-step--${state}` }, marker);
    }),
  );
}

function card(children: Child[], extraClass = ''): HTMLElement {
  return el('div', { class: `obra-wb-card${extraClass ? ` ${extraClass}` : ''}` }, children);
}

function cardTitle(text: string): HTMLElement {
  return el('h2', { class: 'obra-wb-subsection__title' }, [text]);
}

function cardHint(text: string): HTMLElement {
  return el('p', { class: 'obra-wb-card__hint' }, [text]);
}

function cardFooter(left: Child[], right: Child[]): HTMLElement {
  return el('div', { class: 'obra-wb-card__footer' }, [
    left.length ? el('div', { class: 'obra-wb-card__footer-side' }, left) : el('span', {}),
    right.length ? el('div', { class: 'obra-wb-card__footer-side' }, right) : el('span', {}),
  ]);
}

function reconLine(label: string, value: string, emphasis = 'plain'): HTMLElement {
  return el('div', { class: `obra-wb-recon__line obra-wb-recon__line--${emphasis}` }, [
    el('span', { class: 'obra-wb-recon__label' }, [label]),
    el('span', { class: 'obra-wb-recon__value figures-tabular' }, [value]),
  ]);
}

function importHeader(step: number): HTMLElement {
  return el('header', { class: 'obra-wb-surface__header' }, [
    el('div', { class: 'obra-wb-surface__titleblock' }, [
      el('h1', { class: 'obra-wb-surface__title' }, ['Importar presupuesto']),
      el('p', { class: 'obra-wb-surface__subtitle' }, [
        'El presupuesto importado es la base de la que se descuentan OC, certificados y caja chica.',
      ]),
    ]),
    stepsStrip(step),
  ]);
}

// --- Step 1 · Carga -----------------------------------------------------------

function sourceCard(): HTMLElement {
  return card([
    cardTitle('Origen de la planilla'),
    cardHint('Elegí el origen: archivo del presupuesto, tabla pegada de Excel o un enlace de Google Sheets.'),
    el(
      'obra-radio-group',
      { value: 'file', 'aria-label': 'Origen de la planilla' },
      [
        el('obra-radio', { value: 'file', checked: '' }, ['Archivo — .xlsx, .xls, .csv']),
        el('obra-radio', { value: 'paste' }, ['Pegar tabla — copiado de Excel']),
        el('obra-radio', { value: 'google' }, ['Google Sheets — enlace compartido']),
      ].map(optionRow),
    ),
    el('div', { class: 'obra-wb-import-drop' }, [
      codicon('cloudDownload', 'obra-wb-import-drop__icon'),
      el('span', { class: 'obra-wb-import-drop__title' }, ['presupuesto-edificio-las-palmeras.xlsx']),
      cardHint('Se leen todas las hojas; en el paso siguiente elegís cuáles importar.'),
    ]),
    cardFooter([], [el('obra-button', {}, [codicon('arrowRight'), 'Analizar planilla'])]),
  ]);
}

// --- Step 2 · Estructura ------------------------------------------------------

function structureCard(): HTMLElement {
  const sheetChips = DEMO_SHEETS.map((sheet) =>
    checkbox(sheet.selected, `${sheet.name} · ~${sheet.items} ítems${sheet.summary ? ' · resumen' : ''}`),
  );
  const columns = DEMO_COLUMNS.map((column) =>
    el('div', { class: 'obra-wb-column' }, [
      el('div', { class: 'obra-wb-column__header' }, [
        el('span', { class: 'obra-wb-column__letter figures-tabular' }, [column.letter]),
        el('span', { class: 'obra-wb-column__name', title: column.header }, [column.header]),
      ]),
      select(ROLE_OPTIONS, column.role, `Rol de la columna ${column.letter} · ${column.header}`),
      el('span', { class: 'obra-wb-column__samples' }, [column.samples]),
    ]),
  );

  return card([
    cardTitle('Hojas a importar'),
    cardHint('Por defecto se elige la hoja con más ítems. Si marcás varias, cada hoja se carga como un rubro propio.'),
    el('div', { class: 'obra-wb-sheet-list' }, sheetChips),
    el('div', { class: 'obra-wb-structure-formats' }, [
      el('div', { class: 'obra-wb-field' }, [
        el('span', { class: 'obra-wb-field__label' }, ['Formato de números']),
        select(
          [
            ['PY', '1.234.567,89 (coma decimal)'],
            ['EN', '1,234,567.89 (punto decimal)'],
          ],
          'PY',
          'Formato de números',
        ),
        cardHint('Detectado: coma decimal. Las celdas numéricas de Excel no se ven afectadas.'),
      ]),
      checkbox(false, 'Incluir filas ocultas de Excel'),
    ]),
    cardTitle('Columnas de la hoja'),
    el('div', { class: 'obra-wb-column-tools' }, [
      select(
        DEMO_SHEETS.map((s) => [s.name, s.name] as [string, string]),
        'Presupuesto',
        'Hoja a revisar',
      ),
      cardHint('Encabezado en la fila'),
      select(
        Array.from({ length: 10 }, (_, i) => [String(i + 1), String(i + 1)] as [string, string]),
        '1',
        'Fila del encabezado',
      ),
      el('span', { class: 'obra-wb-flag' }, ['Encabezado en dos filas combinado']),
    ]),
    el('div', { class: 'obra-wb-columns' }, columns),
    cardFooter(
      [el('obra-button', { variant: 'secondary' }, [codicon('arrowLeft'), 'Volver'])],
      [el('obra-button', {}, [codicon('arrowRight'), 'Leer filas y revisar'])],
    ),
  ]);
}

// --- Step 3 · Revisión y cuadre ------------------------------------------------

function reconciliationCard(variant: BudgetImportVariant): HTMLElement {
  const unbalanced = variant === 'unbalanced';
  return card([
    el('div', { class: 'obra-wb-recon__head' }, [
      el('span', { class: 'obra-wb-recon__scale' }, [codicon('graph')]),
      cardTitle('Cuadre del presupuesto'),
      el('span', { class: `obra-wb-flag${unbalanced ? ' obra-wb-flag--alert' : ' obra-wb-flag--ok'}` }, [
        unbalanced ? 'No cuadra' : 'Cuadra',
      ]),
    ]),
    el('div', { class: 'obra-wb-recon' }, [
      reconLine('Suma de ítems (2)', DEMO_TOTALS.itemsTotal),
      ...DEMO_ROWS.filter((r) => r.kind === 'RECARGO').map((r) => reconLine(r.description, r.amountLoaded)),
      reconLine('Total según ítems + recargos', unbalanced ? '1.250.000,00' : DEMO_TOTALS.sheetComputedTotal, 'strong'),
      reconLine(
        unbalanced ? 'Total que declara la planilla (dif. −15.000,00)' : 'Total que declara la planilla',
        unbalanced ? '1.250.000,00' : DEMO_TOTALS.declaredGrandTotal,
      ),
      reconLine('Monto contractual que se fija para la obra', DEMO_TOTALS.sheetComputedTotal),
      reconLine('Presupuesto que se carga para control', DEMO_TOTALS.budgetTotal, 'strong'),
    ]),
  ]);
}

function recargoTreatments(): HTMLElement {
  return card([
    cardTitle('Recargos'),
    cardHint('Elegí qué hace con cada recargo: prorratearlo en los precios unitarios, cargarlo como partida propia o no cargarlo.'),
    ...DEMO_ROWS.filter((r) => r.kind === 'RECARGO').map((r) =>
      el('div', { class: 'obra-wb-treatment' }, [
        el('span', { class: 'obra-wb-treatment__name' }, [r.description]),
        select(TREATMENT_OPTIONS, r.description.startsWith('IVA') ? 'IGNORE' : 'DISTRIBUTE', `Tratamiento de ${r.description}`),
      ]),
    ),
  ]);
}

function rubroChecks(variant: BudgetImportVariant): HTMLElement {
  const unbalanced = variant === 'unbalanced';
  return card([
    cardTitle('Subtotales por rubro'),
    el('div', { class: 'obra-wb-checks' }, [
      el('div', { class: 'obra-wb-check' }, [
        el('span', {}, ['1.1 FUNDACIONES']),
        el('span', { class: `obra-wb-check__result${unbalanced ? ' obra-wb-check__result--mismatch' : ''} figures-tabular` }, [
          unbalanced ? 'dif. −15.000,00' : 'OK',
        ]),
      ]),
    ]),
  ]);
}

function strategyCard(): HTMLElement {
  return card([
    cardTitle('Si Cantidad × PU no coincide con el total'),
    select(
      [
        ['KEEP_ORIGINAL', 'Respetar el total de la planilla'],
        ['RECALCULATE_TOTAL', 'Recalcular el total (Cantidad × PU)'],
        ['RECALCULATE_PU', 'Recalcular el PU (Total ÷ Cantidad)'],
      ],
      'KEEP_ORIGINAL',
      'Estrategia aritmética',
    ),
  ]);
}

function issuesCard(variant: BudgetImportVariant): HTMLElement {
  const unbalanced = variant === 'unbalanced';
  if (!unbalanced) {
    return card([
      cardTitle('Avisos'),
      el('p', { class: 'obra-wb-issue' }, [
        codicon('warning'),
        ' La hoja «Presupuesto» tiene 2 fórmulas sin valor calculado. Abrí el archivo en Excel, guardalo y volvé a subirlo.',
      ]),
    ]);
  }
  return card([
    cardTitle('Avisos'),
    el('p', { class: 'obra-wb-issue obra-wb-issue--critical' }, [
      codicon('error'),
      ' 1 error a corregir antes de importar (filtrá por «Con problemas»).',
    ]),
    el('p', { class: 'obra-wb-issue' }, [
      codicon('warning'),
      ' «FUNDACIONES»: la planilla dice 1.250.000 y los ítems suman 1.000.000',
    ]),
  ]);
}

function rowsCard(variant: BudgetImportVariant): HTMLElement {
  const unbalanced = variant === 'unbalanced';
  const columns: DataTableColumn[] = [
    { key: 'rowNumber', header: 'Fila' },
    { key: 'kind', header: 'Tipo' },
    { key: 'level', header: 'Nivel', align: 'end', figures: 'tabular' },
    { key: 'code', header: 'Código' },
    { key: 'description', header: 'Descripción' },
    { key: 'unit', header: 'Un.' },
    { key: 'quantity', header: 'Cantidad', align: 'end', figures: 'tabular' },
    { key: 'unitPrice', header: 'P. unitario', align: 'end', figures: 'tabular' },
    { key: 'totalPrice', header: 'Total planilla', align: 'end', figures: 'tabular' },
    { key: 'amountLoaded', header: 'Monto a cargar', align: 'end', figures: 'tabular' },
  ];
  const rows: DataTableRow[] = DEMO_ROWS.map((row) => ({
    values: {
      rowNumber: row.rowNumber,
      kind: KIND_LABELS[row.kind],
      level: String(row.level),
      code: row.code,
      description: row.description,
      unit: row.unit,
      quantity: row.quantity,
      unitPrice: row.unitPrice,
      totalPrice: row.totalPrice,
      amountLoaded: row.amountLoaded,
    },
    level: row.level,
    emphasis: row.kind === 'RUBRO' || row.kind === 'SUBRUBRO' ? 'group' : undefined,
  }));
  const table = el('obra-data-table', { 'aria-label': 'Revisión de las filas de la planilla' }) as unknown as DataTableElement;
  table.setData(columns, rows as DataTableRow[]);
  return card([
    el('div', { class: 'obra-wb-rows-tools' }, [
      el('obra-filter-bar', {
        placeholder: 'Buscar código o descripción…',
        'aria-label': 'Buscar en las filas',
      }),
      select(
        [
          ['ALL', 'Todas (7)'],
          ['ISSUES', `Con problemas (${unbalanced ? 1 : 0})`],
          ['STRUCTURE', 'Rubros, subtotales y recargos'],
          ['IGNORED', 'Ignoradas'],
        ],
        'ALL',
        'Filtrar filas',
      ),
    ]),
    cardHint('Cambiá el tipo o el nivel de cualquier fila y el cuadre se recalcula al instante. El padre de cada fila es el rubro anterior más cercano con un nivel menos.'),
    table,
    cardHint('Página 1 de 1 · 7 filas'),
  ]);
}

// --- Step 4 · Confirmar --------------------------------------------------------

function stat(label: string, value: string): HTMLElement {
  return el('div', { class: 'obra-wb-stat' }, [
    el('span', { class: 'obra-wb-stat__label' }, [label]),
    el('span', { class: 'obra-wb-stat__value figures-tabular' }, [value]),
  ]);
}

function confirmCard(variant: BudgetImportVariant): HTMLElement {
  const unbalanced = variant === 'unbalanced';
  const note: Child[] = unbalanced
    ? [checkbox(false, 'El presupuesto no cuadra con la planilla (dif. −15.000,00). Confirmo importarlo igual; la diferencia queda registrada.')]
    : [
        el('p', { class: 'obra-wb-issue' }, [
          codicon('check'),
          ' El cuadre entre la planilla y los ítems cargados está OK; la diferencia con el monto contractual queda registrada.',
        ]),
      ];
  return card([
    cardTitle('Confirmar importación'),
    el('div', { class: 'obra-wb-stats' }, [
      stat('Rubros', '1'),
      stat('Subrubros', '1'),
      stat('Ítems', '2'),
      stat('Presupuesto de control', DEMO_TOTALS.budgetTotal),
    ]),
    cardHint('Se reemplaza el presupuesto actual de la obra (salvo Gastos Generales). Solo es posible mientras no haya OC, certificados ni gastos imputados.'),
    ...note,
    cardFooter(
      [el('obra-button', { variant: 'secondary' }, [codicon('arrowLeft'), 'Volver a revisar'])],
      [el('obra-button', {}, [codicon('check'), 'Importar presupuesto'])],
    ),
  ]);
}

// --- Resultado -----------------------------------------------------------------

function resultCard(): HTMLElement {
  return card([
    el('obra-empty-state', {
      heading: 'Se importó el presupuesto',
      message: 'El presupuesto de control queda cargado con la planilla importada.',
    }),
    el('div', { class: 'obra-wb-summary' }, [
      el('obra-property-row', { label: 'Presupuesto de control (PYG)', value: DEMO_TOTALS.budgetTotal }),
      el('obra-property-row', { label: 'Monto del contrato (PYG)', value: DEMO_TOTALS.sheetComputedTotal }),
    ]),
    cardHint('Se creó también el rubro «Gastos Generales / No imputados» para gastos sin partida.'),
    cardFooter([], [el('obra-button', {}, [codicon('table'), 'Ir al presupuesto'])]),
  ]);
}

// --- Surface -------------------------------------------------------------------

export function projectBudgetImportEditor(
  step: BudgetImportStep = 'source',
  options: { variant?: BudgetImportVariant } = {}
): HTMLElement {
  const variant = options.variant ?? 'balanced';
  const surface = el('div', { class: 'obra-wb-surface' });
  surface.append(importHeader(SUFFIX_STEP[step]));

  switch (step) {
    case 'source':
      surface.append(sourceCard());
      break;
    case 'structure':
      surface.append(structureCard());
      break;
    case 'review':
      surface.append(
        reconciliationCard(variant),
        recargoTreatments(),
        rubroChecks(variant),
        strategyCard(),
        issuesCard(variant),
        rowsCard(variant),
        cardFooter(
          [el('obra-button', { variant: 'secondary' }, [codicon('arrowLeft'), 'Volver a la estructura'])],
          [el('obra-button', {}, [codicon('arrowRight'), 'Continuar'])],
        ),
      );
      break;
    case 'confirm':
      surface.append(confirmCard(variant));
      break;
    case 'result':
      surface.append(resultCard());
      break;
  }
  return surface;
}
