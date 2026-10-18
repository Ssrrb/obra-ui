import { describe, it, expect } from 'vitest';
import { createDefaultSchedule, createDefaultItems } from '@/data/defaultBudget';
import { recalculateItems, getGrandTotal } from '@/services/calculation/calculator';

describe('Default Budget', () => {
  it('creates a valid schedule', () => {
    const schedule = createDefaultSchedule();
    // i18next.t() returns undefined in test env (not initialized)
    // so schedule.name is undefined — just check it exists as a key
    expect('name' in schedule).toBe(true);
    expect(schedule.projectName).toBe('');
    expect(schedule.currency).toBe('PYG');
    expect(schedule.status).toBe('DRAFT');
    expect(schedule.id).toBeTruthy();
    expect(schedule.ifcGuid).toBeTruthy();
  });

  it('creates the K row as the only default staart item', () => {
    const items = createDefaultItems();
    expect(items.map(i => [i.rowType, i.description, i.staartPercentage, i.staartBasis])).toEqual([
      ['staart_ak', 'Gastos generales (K)', '10', 'kostprijs'],
    ]);
    for (const item of items) {
      expect(item.id).toBeTruthy();
      expect(item.ifcGuid).toBeTruthy();
    }
  });

  it('recalculates without errors', () => {
    const items = recalculateItems(createDefaultItems());
    const total = getGrandTotal(items);
    // Empty budget with only staart items has 0 total
    expect(total).toBe('0');
  });

  it('all parent references are valid', () => {
    const items = createDefaultItems();
    const ids = new Set(items.map(i => i.id));
    for (const item of items) {
      if (item.parentId !== null) {
        expect(ids.has(item.parentId)).toBe(true);
      }
    }
  });

  it('all staart items have null parentId', () => {
    const items = createDefaultItems();
    for (const item of items) {
      expect(item.parentId).toBeNull();
    }
  });

  it('legacy scalars follow the K row', () => {
    const schedule = createDefaultSchedule();
    expect([schedule.uitvoeringskosten, schedule.algemeneKosten, schedule.winstRisico]).toEqual(['0', '10', '0']);
  });
});
