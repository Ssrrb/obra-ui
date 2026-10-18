/**
 * Gedeelde kern voor álle importers (XML, binair en tekst).
 *
 * Eén plek voor: getal-/eenheid-normalisatie, id/guid-generatie, de
 * CostItem-fabriek en een BudgetBuilder die hiërarchie (sortOrder/depth/
 * parentId) consistent bijhoudt. Elke importer bouwt hierop, zodat er geen
 * losse, net-iets-andere item-fabrieken meer rondzwerven.
 */
import type { CostItem, CostUnit, RowType } from '@/types/costModel';
import type { DecimalString } from '@ctrlmas/budget-engine';
import { fromNumber } from '@/utils/decimal';
import { canonicalParts } from '@/utils/numericInput';

// ── id / guid ───────────────────────────────────────────────────────────────

let _idCounter = 0;

/** Stabiele, uniek-genoeg id. Gebruikt crypto.randomUUID indien beschikbaar. */
export function genId(prefix = 'imp'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  _idCounter += 1;
  return `${prefix}-${_idCounter.toString(36)}`;
}

const GUID_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz_$';
/** 22-teken IFC-stijl GUID-placeholder. */
export function genIfcGuid(): string {
  let out = '';
  if (typeof crypto !== 'undefined' && typeof crypto.getRandomValues === 'function') {
    const buf = new Uint8Array(22);
    crypto.getRandomValues(buf);
    for (let i = 0; i < 22; i++) out += GUID_CHARS[buf[i] % 64];
    return out;
  }
  for (let i = 0; i < 22; i++) out += GUID_CHARS[(_idCounter * 31 + i * 7) % 64];
  return out;
}

// ── getallen ──────────────────────────────────────────────────────────────

/**
 * Parse een getal uit tekst of number. Ondersteunt NL-decimalen ("1.234,56")
 * én EN-decimalen ("1234.56"); leeg/onleesbaar → 0.
 */
export function parseNumber(raw: string | number | null | undefined): number {
  if (typeof raw === 'number') return Number.isFinite(raw) ? raw : 0;
  if (raw == null) return 0;
  const s = String(raw).trim();
  if (!s) return 0;
  // Komma aanwezig → NL: punten zijn duizendtallen, komma is decimaal.
  const t = s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s;
  const n = parseFloat(t.replace(/\s/g, ''));
  return Number.isFinite(n) ? n : 0;
}

/**
 * A number literal from a source file → canonical decimal text, keeping
 * every digit of the literal (no binary double in between). Same reading as
 * parseNumber: a comma means NL/es notation ("1.234,56"), otherwise the dot
 * is the decimal point ("1234.56"); whitespace is ignored; an exponent
 * ("1.5E3") is accepted. Empty or unreadable → '0' (as parseNumber).
 * Throws when the literal has more than 24 integer / 12 fraction digits:
 * importing must not round silently.
 */
export function parseDecimal(raw: string | number | null | undefined): DecimalString {
  if (typeof raw === 'number') return fromNumber(raw) ?? '0';
  const s = String(raw ?? '').replace(/\s/g, '');
  if (!s) return '0';
  const t = s.indexOf(',') >= 0 ? s.replace(/\./g, '').replace(',', '.') : s;
  const m = /^([+-]?)(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/.exec(t);
  if (!m || (!m[2] && !m[3])) {
    const n = parseFloat(t); // upstream tolerance for trailing text ("12 m2")
    return Number.isFinite(n) ? parseDecimal(/^[+-]?\d*\.?\d+/.exec(t)?.[0] ?? '0') : '0';
  }
  let int = m[2] ?? '';
  let frac = m[3] ?? '';
  const exp = m[4] ? parseInt(m[4], 10) : 0;
  if (exp > 0) { frac = frac.padEnd(exp, '0'); int += frac.slice(0, exp); frac = frac.slice(exp); }
  if (exp < 0) { int = int.padStart(-exp + 1, '0'); frac = int.slice(int.length + exp) + frac; int = int.slice(0, int.length + exp); }
  const r = canonicalParts(m[1] === '-', int, frac);
  if (!r.ok) throw new Error(`${raw}: ${r.message}`);
  return r.value ?? '0';
}

/** Like parseDecimal but empty text stays null. */
export function parseDecimalOrNull(raw: string | number | null | undefined): DecimalString | null {
  return raw == null || (typeof raw === 'string' && !raw.trim()) ? null : parseDecimal(raw);
}

// ── eenheden ────────────────────────────────────────────────────────────────

const UNIT_MAP: Record<string, CostUnit> = {
  st: 'st', stk: 'st', stl: 'st', stuk: 'st', stuks: 'st',
  m: 'm', m1: 'm', meter: 'm',
  m2: 'm²', 'm^2': 'm²', 'm²': 'm²',
  m3: 'm³', 'm^3': 'm³', 'm³': 'm³',
  kg: 'kg', ton: 'ton',
  uur: 'uur', u: 'uur', h: 'uur',
  dg: 'dgn', dgn: 'dgn', dag: 'dgn', dagen: 'dgn',
  km: 'km', keer: 'keer', ls: 'ls',
  week: 'week', wk: 'week',
  mnd: 'mnd', maand: 'mnd',
  post: 'post', pst: 'post', eur: 'post',
  '%': '%', pm: 'pm',
};

/** Normaliseer een vrije eenheid-tekst ("m3", "M²", "stuks") naar CostUnit. */
export function normalizeUnit(raw: string | null | undefined): CostUnit {
  const s = (raw ?? '').trim().toLowerCase();
  return UNIT_MAP[s] ?? 'st';
}

// ── CostItem-fabriek ──────────────────────────────────────────────────────

/**
 * Bouw een volledige CostItem met alle verplichte velden ingevuld. Geef alleen
 * de relevante velden mee; de rest krijgt zinnige defaults. `rowType` is altijd
 * vereist (bepaalt o.a. de default voor `verrekenbaar`).
 */
/** Money fields an importer may still hand over as a number (converted by makeCostItem). */
const DECIMAL_FIELDS = ['quantity', 'materialPrice', 'laborPrice', 'unitPrice', 'total', 'staartPercentage', 'normQuantity', 'normFactor', 'normDivisor', 'normUnitPrice', 'staartDoelbedrag', 'staartVastBedrag', 'staartAfrondingStap', 'staartBtwBasis'] as const;
type DecimalField = typeof DECIMAL_FIELDS[number];
/**
 * Item input of an importer: money as decimal text, or as a number for
 * formats whose values are binary doubles or computed by the importer
 * (converted with its shortest round-trip text, see fromNumber).
 */
export type ItemDraft = Omit<Partial<CostItem>, DecimalField> & { rowType: RowType } & {
  [K in DecimalField]?: DecimalString | number | null;
};

const toDecimalFields = (partial: ItemDraft): Partial<CostItem> => {
  const out: Record<string, unknown> = { ...partial };
  for (const f of DECIMAL_FIELDS) {
    const v = out[f];
    if (typeof v === 'number') out[f] = fromNumber(v);
  }
  return out as Partial<CostItem>;
};

export function makeCostItem(draft: ItemDraft): CostItem {
  const rowType = draft.rowType;
  const partial = toDecimalFields(draft);
  return {
    id: genId(),
    parentId: null,
    sortOrder: 0,
    code: '',
    description: '',
    unit: 'st',
    quantity: null,
    materialPrice: null,
    laborPrice: null,
    unitPrice: '0',
    total: '0',
    isCollapsed: false,
    depth: 0,
    notes: '',
    ifcGuid: genIfcGuid(),
    staartPercentage: null,
    nr: '',
    normQuantity: null,
    normFactor: null,
    normDivisor: null,
    normUnitPrice: null,
    resourceType: null,
    resourceLibraryId: null,
    tariefGroep: null,
    verrekenbaar: rowType === 'chapter' ? 'V' : null,
    ...partial,
    rowType,
  };
}

// ── BudgetBuilder ─────────────────────────────────────────────────────────

/**
 * Houdt de items-lijst + oplopende sortOrder bij, zodat importers zich op de
 * mapping kunnen richten i.p.v. op boekhouding. `add` retourneert het item
 * (handig om de id als parentId voor kinderen te gebruiken).
 */
export class BudgetBuilder {
  readonly items: CostItem[] = [];
  private _sort = 0;

  add(partial: ItemDraft): CostItem {
    const item = makeCostItem({ sortOrder: this._sort++, ...partial });
    this.items.push(item);
    return item;
  }

  get length(): number {
    return this.items.length;
  }
}
