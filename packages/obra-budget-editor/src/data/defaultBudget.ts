import type { CostItem, CostSchedule } from '@/types/costModel';
import { createDefaultProjectProperties } from '@/types/costModel';
import i18next from 'i18next';
import { synthesizeStaartItems } from '@/services/calculation/staartDefaults';

function generateIfcGuid(): string {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
  let r = '';
  for (let i = 0; i < 22; i++) r += chars[Math.floor(Math.random() * 64)];
  return r;
}

/**
 * Empty schedule for initial state before async load.
 *
 * The legacy scalars (uitvoeringskosten/algemeneKosten/winstRisico) that
 * reports and exports still read follow the default staart items, the source
 * of truth: algemeneKosten ← the K row (staart_ak); the others are 0.
 */
export function createDefaultSchedule(): CostSchedule {
  const staart = createDefaultItems();
  const pctOf = (rowType: string): string =>
    staart.find((i) => i.rowType === rowType)?.staartPercentage ?? '0';
  return {
    id: crypto.randomUUID(),
    name: i18next.t('newBudget', { defaultValue: 'New budget' }),
    description: '',
    status: 'DRAFT',
    predefinedType: 'ESTIMATE',
    currency: 'PYG',
    projectName: '',
    projectNumber: '',
    client: '',
    author: '',
    ifcGuid: generateIfcGuid(),
    uitvoeringskosten: '0',
    algemeneKosten: pctOf('staart_ak'),
    winstRisico: '0',
    projectProperties: createDefaultProjectProperties(),
  };
}

/** Default staart of a new budget: the K row (see synthesizeStaartItems). */
export function createDefaultItems(): CostItem[] {
  return synthesizeStaartItems(undefined).map((item) => ({ ...item, ifcGuid: generateIfcGuid() }));
}

