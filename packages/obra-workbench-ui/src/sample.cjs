/*---------------------------------------------------------------------------------------------
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root.
 * Generated from the Storybook explorer fixture; see tests/build.test.mjs.
 *--------------------------------------------------------------------------------------------*/
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

const EXPLORER_ITEMS = [
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

module.exports = EXPLORER_ITEMS;
