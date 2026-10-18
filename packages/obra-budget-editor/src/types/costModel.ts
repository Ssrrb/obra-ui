/**
 * Schema 2 cost model. The types (money as DecimalString) come from
 * @ctrlmas/budget-engine, the one definition shared with host and server;
 * this file is a thin shim so upstream `@/types/costModel` imports keep
 * working. The helpers below are upstream's, unchanged (no money involved).
 */
import type { ProjectInfo, ProjectProperty, RowType } from '@ctrlmas/budget-engine';

export type * from '@ctrlmas/budget-engine';

export function createDefaultProjectInfo(): ProjectInfo {
  return {
    projectType: '',
    architect: '',
    locatie: '',
    bouwmethode: '',
    tekeningSoort: '',
    renderImages: [],
    projectFotos: [],
    aanhefType: 'dhr',
    aanhefNaam: '',
  };
}

export function createDefaultProjectProperties(): ProjectProperty[] {
  return [
    { id: crypto.randomUUID(), name: 'Volumen bruto', value: null, unit: 'm\u00B3', isDefault: true },
    { id: crypto.randomUUID(), name: 'Superficie cubierta', value: null, unit: 'm\u00B2', isDefault: true },
  ];
}

/** Helper: check if a row type is a "staart" (surcharge) type */
export function isStagartRowType(rowType: RowType): boolean {
  return rowType.startsWith('staart_');
}

/** Helper: check if a row type can have children */
export function isContainerRowType(rowType: RowType): boolean {
  return rowType === 'chapter' || rowType === 'begrotingspost' || rowType === 'bewakingspost';
}
