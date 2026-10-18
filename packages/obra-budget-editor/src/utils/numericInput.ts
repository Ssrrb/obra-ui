import { parseDecimalInput as engineParseDecimalInput, type DecimalString } from '@ctrlmas/budget-engine';

/**
 * Grid input for number cells, as canonical decimal text (schema 2): a plain
 * number in es-PY notation ("6,66", "1.234,56"), plain notation where
 * upstream accepted it ("1234.56"), or a formula ("=12,2*2,22", "17,7+5").
 * Parsing and arithmetic are the engine's (`parseDecimalInput`); nothing here goes
 * through a binary float. Values beyond 24 integer or 12 fraction digits are
 * rejected with a message, never rounded.
 */
export type DecimalInput =
  | { readonly ok: true; readonly value: DecimalString | null }
  | { readonly ok: false; readonly message: string };

export const MAX_INTEGER_DIGITS = 24;
export const MAX_FRACTION_DIGITS = 12;

export const INPUT_MESSAGES = {
  invalid: 'Número no válido. Usa 1.234,56 o una fórmula como =12,5*3.',
  formula: `Fórmula no válida, división por cero o resultado con más de ${MAX_INTEGER_DIGITS} enteros o ${MAX_FRACTION_DIGITS} decimales.`,
  integer: `El valor supera ${MAX_INTEGER_DIGITS} dígitos enteros.`,
  fraction: `El valor tiene más de ${MAX_FRACTION_DIGITS} decimales; no se redondea.`,
} as const;

/**
 * Parse user input with the engine's `parseDecimalInput` (es-PY, upstream
 * parseNlNumber rules: "1.500" is 1500). Empty input is `{ ok: true, value:
 * null }` (clears the cell). When the engine rejects the text, the message
 * says why: too many integer or fraction digits, or an invalid formula.
 */
export function parseDecimalInput(input: string): DecimalInput {
  const trimmed = input.trim();
  if (!trimmed) return { ok: true, value: null };
  const value = engineParseDecimalInput(trimmed, 'es-PY');
  if (value !== null) return { ok: true, value };
  const body = trimmed.replace(/^=/, '').trim();
  const looksLikeExpr = trimmed.startsWith('=') || /[*/()]/.test(body) || /\d\s*[+-]/.test(body);
  if (looksLikeExpr) {
    // A literal inside the formula beyond the limits?
    for (const tok of body.match(/\d[\d.,]*/g) ?? []) {
      const r = parseDecimalLiteral(tok);
      if (!r.ok && r.message !== INPUT_MESSAGES.invalid) return r;
    }
    return { ok: false, message: INPUT_MESSAGES.formula };
  }
  const literal = parseDecimalLiteral(body);
  return literal.ok ? { ok: false, message: INPUT_MESSAGES.invalid } : literal;
}

/** Compatibility shim for callers that only need the value: invalid → null. */
export function parseNumericInput(input: string): DecimalString | null {
  return engineParseDecimalInput(input, 'es-PY');
}

/**
 * One number literal → canonical decimal, used only to explain a rejection
 * (and by importers for digit limits). Comma = decimal separator and dots
 * are thousands; without a comma, several dots are thousands and one dot is
 * thousands only when exactly three digits follow ("1.234" → 1234,
 * "60.5" → 60.5), as upstream's parseNlNumber did.
 */
export function parseDecimalLiteral(text: string): DecimalInput {
  let s = text.trim().replace(/\s/g, '');
  let negative = false;
  if (s.startsWith('-') || s.startsWith('+')) {
    negative = s[0] === '-';
    s = s.slice(1);
  }
  if (!/^[\d.,]+$/.test(s)) return { ok: false, message: INPUT_MESSAGES.invalid };
  let intPart: string;
  let fracPart = '';
  const comma = s.indexOf(',');
  if (comma >= 0) {
    if (s.indexOf(',', comma + 1) >= 0) return { ok: false, message: INPUT_MESSAGES.invalid };
    intPart = s.slice(0, comma).replace(/\./g, '');
    fracPart = s.slice(comma + 1);
    if (fracPart.includes('.')) return { ok: false, message: INPUT_MESSAGES.invalid };
  } else {
    const dots = s.split('.').length - 1;
    if (dots > 1 || (dots === 1 && /^\d+\.\d{3}$/.test(s))) {
      intPart = s.replace(/\./g, '');
    } else if (dots === 1) {
      [intPart, fracPart] = s.split('.') as [string, string];
    } else {
      intPart = s;
    }
  }
  if (!intPart && !fracPart) return { ok: false, message: INPUT_MESSAGES.invalid };
  return canonicalParts(negative, intPart, fracPart);
}

/** Digits → canonical decimal (DECIMAL_PATTERN), or a limit message. */
export function canonicalParts(negative: boolean, intDigits: string, fracDigits: string): DecimalInput {
  const int = intDigits.replace(/^0+/, '') || '0';
  const frac = fracDigits.replace(/0+$/, '');
  if (int.length > MAX_INTEGER_DIGITS) return { ok: false, message: INPUT_MESSAGES.integer };
  if (frac.length > MAX_FRACTION_DIGITS) return { ok: false, message: INPUT_MESSAGES.fraction };
  const body = frac ? `${int}.${frac}` : int;
  return { ok: true, value: negative && body !== '0' ? `-${body}` : body };
}

/**
 * Rewrites every number token of a sub-sheet formula to dot notation
 * ("1.234,56" → "1234.56"); other text stays. Sub-sheets keep their own
 * spreadsheet engine; this only normalizes the text it receives.
 */
export function normalizeDecimalsInExpression(expr: string): string {
  return expr.replace(/\d[\d.,]*/g, (tok) => {
    // Inside formulas a lone dot is a decimal point ("12.2"), as upstream.
    const lone = tok.indexOf(',') < 0 && tok.split('.').length === 2;
    const r = lone ? canonicalParts(false, ...(tok.split('.') as [string, string])) : parseDecimalLiteral(tok);
    return r.ok && r.value !== null ? r.value : tok;
  });
}
