/**
 * Editor-side shorthands over the engine's decimal helpers. All arithmetic
 * goes through the engine's decimal.js clone (`Dec`, 80 digits, HALF_UP);
 * nothing here re-implements it.
 */
import { Dec, decimalOf, normalizeDecimal, toDecimalString, type DecimalString } from '@ctrlmas/budget-engine';

export { Dec };

/** Stored decimal (null/undefined = 0, as upstream `?? 0`) → Dec. */
export const dec = (value: DecimalString | null | undefined): Dec => decimalOf(value);

/** Computed Dec → canonical decimal text (HALF_UP to 12 decimals). */
export const str = (value: Dec): DecimalString => toDecimalString(value);

/** Sum of stored decimals. */
export const sumDec = (values: Iterable<DecimalString | null | undefined>): Dec => {
  let total = new Dec(0);
  for (const v of values) total = total.plus(dec(v));
  return total;
};

/** Is a stored decimal absent or zero? */
export const isZeroDec = (value: DecimalString | null | undefined): boolean => dec(value).isZero();

/**
 * A number from a source that only has binary doubles (xlsx cells, legacy
 * code paths) → decimal text via its shortest round-trip representation
 * (`String(n)`), so 0.1 stays "0.1". Non-finite → null.
 */
export const fromNumber = (n: number): DecimalString | null => {
  if (!Number.isFinite(n)) return null;
  return normalizeDecimal(String(n), { exponent: true }) ?? toDecimalString(new Dec(String(n)));
};

/** Display/heuristic-only conversion to a double; never for stored money. */
export const toNumber = (value: DecimalString | null | undefined): number => (value == null ? 0 : Number(value));
