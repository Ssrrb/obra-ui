import { useCallback } from 'react';
import i18next from 'i18next';
import { useAppStore } from '@/state/appStore';
import { getColumnsForView } from './gridConstants';
import { parseDecimalInput } from '@/utils/numericInput';
import type { CostItem, CostUnit } from '@/types/costModel';

export function useGridEditing() {
  const { updateItem, pushHistory, items, gridView, prorateUrenForChapter, schedule, setInputError } = useAppStore();

  // Mét branchesEnabled: anders schuiven alle kolomindices één op zodra de
  // branch-kolom zichtbaar is en schrijft een commit naar het verkeerde veld.
  const columns = getColumnsForView(gridView, !!schedule.branchesEnabled);

  const commitEdit = useCallback(
    (item: CostItem, colIndex: number, value: string) => {
      const col = columns[colIndex];
      if (!col || !col.editable) return;

      // WPCalc: de uren-som op de hoofdstuk-FOOTERRIJ bewerken herrekent alle
      // regel-normen in dat hoofdstuk naar rato.
      if (item.id.startsWith('footer:') && col.key === 'hoeveelheid') {
        const parsed = parseDecimalInput(value);
        if (!parsed.ok) { setInputError(parsed.message); return; }
        setInputError(null);
        const newTotal = parsed.value;
        if (newTotal != null) {
          pushHistory(items, i18next.t('grid:undo.chapterHoursProrate'));
          prorateUrenForChapter(item.id.replace('footer:', ''), newTotal);
        }
        return;
      }
      // Synthetische footerrijen verder nooit als item updaten
      if (item.id.startsWith('footer:')) return;

      // Afronding-staartregel: het ingevulde bedrag wordt een vaste
      // sluitpost; leegmaken schakelt terug naar automatisch afronden.
      if (item.rowType === 'staart_afronding' && col.key === 'total') {
        const parsed = parseDecimalInput(value);
        if (!parsed.ok) { setInputError(parsed.message); return; }
        setInputError(null);
        pushHistory(items, i18next.t('grid:undo.fillRounding'));
        updateItem(item.id, 'staartDoelbedrag', null);
        updateItem(item.id, 'staartVastBedrag', parsed.value);
        return;
      }

      // Number cells: parse first, so rejected input neither edits nor adds an undo entry.
      let parsedNumber: string | null = null;
      if (col.type === 'number' || col.type === 'currency') {
        const parsed = parseDecimalInput(value);
        if (!parsed.ok) { setInputError(parsed.message); return; }
        setInputError(null);
        parsedNumber = parsed.value;
      }

      pushHistory(items, i18next.t('grid:undo.editCell', { column: col.key }));

      // Map grid column keys to CostItem field names
      const keyMap: Record<string, string> = {
        productienorm: 'normQuantity',
        productiecapaciteit: 'normFactor',
        hoeveelheid: 'quantity',
        // UI-2 'Hst'-kolom: hoofdstuknummer leeft op CostItem.code — zonder
        // deze mapping schrijft de edit naar een niet-bestaand veld en
        // "gebeurt er niks" bij het wijzigen van een hoofdstuknummer.
        chapterCode: 'code',
      };
      const fieldKey = keyMap[col.key] ?? col.key;

      switch (col.type) {
        case 'text':
          updateItem(item.id, fieldKey, value);
          break;
        case 'number':
        case 'currency': {
          // Formulas accepted ("=12,2*2,22", "12.2*2.2"). Schema 2: the
          // typed value is stored exactly (no silent rounding to cents); the
          // engine quantizes line amounts to two decimals.
          const parsed = parsedNumber;
          // Post-prijs: de Prijs-kolom is dé eigen prijs van een
          // (bewakings)post. Een geïmporteerd materiaal-/loonbedrag wissen
          // we mee, anders telt de oude prijs dubbel op bij de nieuwe.
          if (fieldKey === 'normUnitPrice'
            && (item.rowType === 'begrotingspost' || item.rowType === 'bewakingspost')) {
            if (item.materialPrice != null) updateItem(item.id, 'materialPrice', null);
            if (item.laborPrice != null) updateItem(item.id, 'laborPrice', null);
          }
          updateItem(item.id, fieldKey, parsed);
          break;
        }
        case 'unit-select':
          updateItem(item.id, fieldKey, value as CostUnit);
          break;
        case 'vn-select':
          updateItem(item.id, fieldKey, value);
          break;
        case 'tarief-select':
          updateItem(item.id, 'tariefGroep', value);
          break;
      }
    },
    [columns, updateItem, pushHistory, items, gridView, prorateUrenForChapter, setInputError]
  );

  return { commitEdit };
}
