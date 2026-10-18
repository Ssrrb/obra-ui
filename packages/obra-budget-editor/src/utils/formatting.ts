import { Dec, LINE_SCALE, type DecimalString } from '@ctrlmas/budget-engine';

/**
 * Display of schema-2 decimals in es-PY notation (thousands `.`, decimal
 * `,`). Formatting works on the decimal text, never on a binary float:
 * amounts are rounded HALF_UP to LINE_SCALE (2) decimals by the engine's
 * decimal clone; quantities and coefficients keep every stored digit.
 * A `Dec` value (a computed display value) is accepted as well.
 */
export type DecimalLike = DecimalString | InstanceType<typeof Dec> | null | undefined;

const toDec = (value: DecimalLike): InstanceType<typeof Dec> | null =>
  value === null || value === undefined || value === '' ? null : value instanceof Dec ? value : new Dec(value);

/** Canonical decimal text → es-PY text with at least `minFraction` decimals. */
export function formatDecimalText(text: string, minFraction = 0): string {
  const negative = text.startsWith('-');
  const [int, frac = ''] = (negative ? text.slice(1) : text).split('.');
  const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const fraction = frac.padEnd(minFraction, '0');
  return `${negative ? '-' : ''}${grouped}${fraction ? `,${fraction}` : ''}`;
}

/** Any decimal value → es-PY text: `scale` fixes the decimals (HALF_UP); otherwise full precision with `minFraction`. */
export function formatDecimal(value: DecimalLike, opts: { scale?: number; minFraction?: number } = {}): string {
  const d = toDec(value);
  if (d === null) return '';
  // Without a scale: every stored digit; a computed value (e.g. hours =
  // qty × norm / capacity) is capped at the 12 decimals a DecimalString holds.
  const text = opts.scale !== undefined ? d.toFixed(opts.scale) : d.toDecimalPlaces(12).toFixed();
  return formatDecimalText(text === '-0' || /^-0\.0*$/.test(text) ? text.slice(1) : text, opts.minFraction ?? 0);
}

/** Quantities and coefficients: every stored digit, at least two decimals; '' for null/0 (upstream grid rule). */
export function formatNumber(value: DecimalLike): string {
  const d = toDec(value);
  if (d === null || d.isZero()) return '';
  return formatDecimal(d, { minFraction: 2 });
}

/** Prices and amounts: two decimals HALF_UP; '' for null/0 (upstream grid rule). */
export function formatCurrency(value: DecimalLike): string {
  const d = toDec(value);
  if (d === null || d.isZero()) return '';
  return formatDecimal(d, { scale: LINE_SCALE });
}

/** An amount that is always shown, zero included (totals). */
export function formatAmount(value: DecimalLike, scale: number = LINE_SCALE): string {
  return formatDecimal(toDec(value) ?? new Dec(0), { scale });
}

/** Short currency label for the budget currency (PYG/USD); other codes as-is. */
export function currencyLabel(currency: string | null | undefined): string {
  if (currency === 'PYG') return 'Gs.';
  if (currency === 'USD') return 'US$';
  return currency ?? '';
}

/**
 * Text for the cell editor: comma decimal, no thousands separators, every
 * digit, so committing an unchanged value returns exactly the same decimal.
 */
export function formatNumberForEdit(value: DecimalLike): string {
  const d = toDec(value);
  if (d === null || d.isZero()) return '';
  return d.toFixed().replace('.', ',');
}

/**
 * Upstream NL/es-PY number parser, kept for non-money inputs that stay
 * `number` (sub-sheet cells, project properties such as BVO).
 */
export function parseNlNumber(input: string): number | null {
  if (!input.trim()) return null;
  let cleaned = input.trim();
  if (cleaned.includes(',')) {
    cleaned = cleaned.replace(/\./g, '').replace(',', '.');
  } else {
    const dots = (cleaned.match(/\./g) || []).length;
    if (dots > 1) {
      cleaned = cleaned.replace(/\./g, '');
    } else if (dots === 1) {
      const frac = cleaned.slice(cleaned.indexOf('.') + 1);
      if (/^\d{3}$/.test(frac)) cleaned = cleaned.replace('.', '');
    }
  }
  const num = parseFloat(cleaned);
  return isNaN(num) ? null : num;
}

/**
 * A decimal formatter for a report locale: the locale's group and decimal
 * separators applied to the exact decimal text (groups of three). The ctrl
 * build always uses es-PY notation, the same as the grid.
 */
export function makeDecimalFormatter(intlLocale: string, esPy: boolean): (value: DecimalLike, scale?: number) => string {
  let group = '.';
  let decimal = ',';
  if (!esPy) {
    const parts = new Intl.NumberFormat(`${intlLocale}-u-nu-latn`).formatToParts(1234567.5);
    group = parts.find((p) => p.type === 'group')?.value ?? '';
    decimal = parts.find((p) => p.type === 'decimal')?.value ?? '.';
  }
  return (value, scale = LINE_SCALE) => {
    const text = formatDecimal(toDec(value) ?? new Dec(0), { scale });
    return esPy ? text : text.replace(/[.,]/g, (c) => (c === '.' ? '\u0000' : decimal)).replace(/\u0000/g, group);
  };
}
