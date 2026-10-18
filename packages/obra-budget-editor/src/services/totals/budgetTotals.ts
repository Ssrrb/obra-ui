/**
 * Budget totals under the money policy (engine `computeTotals`): direct
 * cost, markups, IVA per rate, total, contractual adjustment and contract
 * total. Editor, print and export read totals from here, so they all apply
 * the same rules.
 */
import { computeTotals, type BudgetCurrency, type BudgetTotals } from '@ctrlmas/budget-engine';
import type { CostItem, CostSchedule, ProjectFile } from '@/types/costModel';

/** The budget currency the totals use: PYG or USD; anything else (upstream 'EUR') counts as USD (2 decimals). */
export function budgetCurrency(schedule: Pick<CostSchedule, 'currency'>): BudgetCurrency {
  return schedule.currency === 'PYG' ? 'PYG' : 'USD';
}

export function budgetTotals(schedule: CostSchedule, items: CostItem[]): BudgetTotals {
  const doc = { schedule, items } as unknown as ProjectFile;
  return computeTotals(doc, budgetCurrency(schedule));
}

/** Spanish labels of the IVA rates. */
export const IVA_RATE_LABEL: Record<'exento' | '5' | '10', string> = { exento: 'Exento', '5': 'IVA 5%', '10': 'IVA 10%' };
