/**
 * Pure money helpers for the cost-control surface.
 *
 * No DOM, no Intl, no locale dependence: formatting is deterministic so
 * fixtures, screenshots, and node tests agree byte-for-byte. Semantic raw
 * amounts (numbers) live in the protocol; strings exist only at the view
 * boundary (ux/cost-control.yaml "raw_vs_display").
 */

/** Largest accepted amount — beyond this the input is treated as a typo. */
export const MAX_AMOUNT = 1e12;

/**
 * Deterministic currency formatting: grouped integer part, up to two decimal
 * digits only when the amount has a fractional part. `formatMoney(1234, 'USD')`
 * is always "USD 1,234" — identical to the Phase 6 formatter for integers.
 */
export function formatMoney(amount: number, currency: string): string {
  if (!Number.isFinite(amount)) return `${currency} —`;
  const rounded = Math.round(amount * 100) / 100;
  const sign = rounded < 0 ? '-' : '';
  const abs = Math.abs(rounded);
  const intPart = Math.trunc(abs);
  const fracPart = Math.round((abs - intPart) * 100);
  const grouped = String(intPart).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  const frac = fracPart > 0 ? `.${String(fracPart).padStart(2, '0')}` : '';
  return `${currency} ${sign}${grouped}${frac}`;
}

export type MoneyParse =
  | { readonly ok: true; readonly value: number }
  | { readonly ok: false; readonly error: string };

const MONEY_PATTERN = /^\d{1,3}(,\d{3})*(\.\d{1,2})?$|^\d+(\.\d{1,2})?$/;

/**
 * Parse a user-entered amount ("1250", "1,250", "1,250.40"). Rejects empty
 * input, signs, exponents, more than two decimals, and misplaced grouping —
 * every rejection carries the message shown in the form field's error slot.
 */
export function parseMoney(input: string): MoneyParse {
  const trimmed = input.trim();
  if (trimmed === '') return { ok: false, error: 'Enter an amount, for example 1250 or 1,250.40.' };
  if (!MONEY_PATTERN.test(trimmed)) {
    return { ok: false, error: 'Use a plain positive amount with at most two decimals (for example 1250 or 1,250.40).' };
  }
  const value = Number(trimmed.replace(/,/g, ''));
  if (!Number.isFinite(value)) return { ok: false, error: 'Enter a valid amount.' };
  if (value > MAX_AMOUNT) return { ok: false, error: `Amounts must not exceed ${formatMoney(MAX_AMOUNT, '').trim()}.` };
  return { ok: true, value };
}

/** Validate a line-item name; returns the error message or null when valid. */
export function validateItemName(input: string): string | null {
  if (input.trim() === '') return 'Enter a name for the cost line.';
  if (input.trim().length > 300) return 'Names must be 300 characters or fewer.';
  return null;
}
