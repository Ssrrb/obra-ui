/**
 * Bouw 1 style begroting report generator.
 *
 * Produces a landscape A4 HTML report with the standard Bouw 1 layout:
 * - Header with company logo/name, project meta (Volgnr, T.b.v., Project, Datum)
 * - Column layout: Hst | Par | Nr | Omschrijving | Aantal | Eh. | Prijs | Norm | Uren | Tar. | Loon | Materiaal | Materieel | Stelpost | Ond.aann. | Kosten/eh | Subtotaal | Totaal
 * - Chapter subtotals with column breakdowns (uren, loon, materiaal, materieel, stelpost, ond.aann.)
 * - Summary page: uren per tariefgroep, column totals, opslagen (AK, garanties, W&R), risico/winst/verzekering, BTW
 * - Footer with company details and page numbering
 */

import type { CostItem, CostSchedule, CompanyInfo } from '@/types/costModel';
import { getStaartBreakdown } from '@/services/calculation/calculator';
import { isStagartRowType } from '@/types/costModel';
import { makeReportContext, type ReportContext } from '@/i18n/reportI18n';
import type { DecimalString } from '@ctrlmas/budget-engine';
import { CTRL_BUILD } from '@/services/buildFlags';
import { Dec, dec } from '@/utils/decimal';
import { formatDecimal, makeDecimalFormatter, type DecimalLike } from '@/utils/formatting';
import { ivaTotalsRows } from './ivaTotals';

function esc(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

/** Rapporttaal + getalnotatie voor één opbouw van het rapport. */
interface Bouw1Fmt {
  ctx: ReportContext;
  t: ReportContext['t'];
  /** Leeg bij 0/null; anders twee decimalen in de rapporttaal. */
  num: (value: DecimalLike) => string;
  /** Altijd een getal (ook 0), twee decimalen. */
  force: (value: DecimalLike) => string;
  /** Normen: drie decimalen, leeg bij 0/null. */
  norm: (value: DecimalLike) => string;
  /** Exact decimal formatter with a scale (IVA totals block). */
  decimal: (value: DecimalLike, scale?: number) => string;
}

/** Report numbers from the decimal text (no float), HALF_UP; es-PY in the ctrl build. */
function makeBouw1Fmt(ctx: ReportContext): Bouw1Fmt {
  const fmt = makeDecimalFormatter(ctx.intlLocale, CTRL_BUILD);
  const empty = (value: DecimalLike) => value == null || dec(String(value)).isZero();
  return {
    ctx,
    t: ctx.t,
    num: (value) => (empty(value) ? '' : fmt(value, 2)),
    force: (value) => fmt(value, 2),
    norm: (value) => (empty(value) ? '' : fmt(value, 3)),
    decimal: fmt,
  };
}

/**
 * Compute per-item column breakdowns for Bouw1 view.
 * For a 'regel' row: loon/materiaal/materieel/stelpost/onderaanneming based on resourceType.
 * For parent rows: sum of children.
 */
interface Bouw1Row {
  item: CostItem;
  hst: string;
  par: string;
  nr: string;
  loon: Dec;
  materiaal: Dec;
  materieel: Dec;
  stelpost: Dec;
  ondaann: Dec;
  uren: Dec;
  tarief: Dec;
  kostenEh: Dec;
  subtotaal: Dec;
}

type Breakdown = { loon: Dec; materiaal: Dec; materieel: Dec; stelpost: Dec; ondaann: Dec; uren: Dec };
const ZERO = new Dec(0);
const zeroBreakdown = (): Breakdown => ({ loon: ZERO, materiaal: ZERO, materieel: ZERO, stelpost: ZERO, ondaann: ZERO, uren: ZERO });

function computeBouw1Rows(items: CostItem[], schedule: CostSchedule): Bouw1Row[] {
  const tarieven: Record<string, DecimalString> = schedule.tarieven ?? { A: '64', B: '43', C: '82' };

  // Build a map of item -> its direct children
  const childrenMap = new Map<string | null, CostItem[]>();
  for (const item of items) {
    if (isStagartRowType(item.rowType) || item.rowType === 'witregel') continue;
    const list = childrenMap.get(item.parentId) ?? [];
    list.push(item);
    childrenMap.set(item.parentId, list);
  }

  // Compute breakdown per item (bottom-up)
  const breakdownMap = new Map<string, Breakdown>();

  function computeBreakdown(item: CostItem): Breakdown {
    const cached = breakdownMap.get(item.id);
    if (cached) return cached;

    const children = childrenMap.get(item.id) ?? [];
    if (children.length > 0) {
      // Sum children
      const result = zeroBreakdown();
      for (const child of children) {
        const cb = computeBreakdown(child);
        for (const k of Object.keys(result) as (keyof Breakdown)[]) result[k] = result[k].plus(cb[k]);
      }
      breakdownMap.set(item.id, result);
      return result;
    }

    // Leaf node (regel or begrotingspost without children)
    const total = dec(item.total);
    const rt = item.resourceType;
    const r = zeroBreakdown();

    if (item.rowType === 'regel') {
      // Uren volgens de canonieke normformule: aantal × norm / capaciteit
      // (zoals calculator.ts en urenProrate.ts — normFactor is een deler).
      let uren = dec(item.quantity).times(dec(item.normQuantity));
      if (item.normFactor != null && !dec(item.normFactor).isZero()) uren = uren.div(dec(item.normFactor));
      if (item.normDivisor != null && !dec(item.normDivisor).isZero()) uren = uren.div(dec(item.normDivisor));
      r.uren = uren;

      // Get tarief for this row
      const tg = item.tariefGroep ?? 'A';
      const tarief = dec(tarieven[tg] ?? '64');

      if (rt === 'arbeid') {
        r.loon = total;
      } else if (rt === 'materiaal') {
        r.materiaal = total;
      } else if (rt === 'materieel') {
        r.materieel = total;
      } else if (rt === 'onderaannemer') {
        r.ondaann = total;
      } else if (rt === 'overig') {
        r.stelpost = total;
      } else {
        // No resource type set: if has normUnitPrice, try to figure from pricing
        if (item.normUnitPrice != null && dec(item.normUnitPrice).gt(0)) {
          // Has a unit price set: materiaal-like
          const laborPart = uren.times(tarief);
          if (laborPart.gt(0)) {
            r.loon = laborPart;
            r.materiaal = total.minus(laborPart);
            if (r.materiaal.lt(0)) { r.loon = total; r.materiaal = ZERO; }
          } else {
            r.materiaal = total;
          }
        } else if (uren.gt(0)) {
          r.loon = uren.times(tarief);
          if (total.gt(r.loon)) {
            r.materiaal = total.minus(r.loon);
          } else {
            r.loon = total;
          }
        } else {
          // Default: put in onderaanneming if it looks like a subcontract, else materiaal
          r.materiaal = total;
        }
      }
    } else if (item.rowType === 'begrotingspost') {
      // Standalone begrotingspost without children
      if (rt === 'arbeid') r.loon = total;
      else if (rt === 'materiaal') r.materiaal = total;
      else if (rt === 'materieel') r.materieel = total;
      else if (rt === 'onderaannemer') r.ondaann = total;
      else if (rt === 'overig') r.stelpost = total;
      else r.ondaann = total; // default: onderaanneming for standalone posts
    }

    breakdownMap.set(item.id, r);
    return r;
  }

  // Build output rows
  const rows: Bouw1Row[] = [];
  const visibleItems = items.filter(it => !isStagartRowType(it.rowType) && it.rowType !== 'witregel');

  for (const item of visibleItems) {
    const bd = computeBreakdown(item);

    // Generate Hst/Par/Nr columns from hierarchy
    let hst = '', par = '', nr = '';
    if (item.nr) {
      const parts = item.nr.split('.');
      if (parts.length >= 1) hst = parts[0];
      if (parts.length >= 2) par = parts[1];
      if (parts.length >= 3) nr = parts.slice(2).join('.');
    }

    // Determine tarief
    const tg = item.tariefGroep ?? 'A';
    const tarief = dec(tarieven[tg] ?? '64');

    // Kosten/eh
    const qty = dec(item.quantity);
    const kostenEh = qty.gt(0) && dec(item.total).gt(0) ? dec(item.total).div(qty) : ZERO;

    rows.push({ item, hst, par, nr, ...bd, tarief, kostenEh, subtotaal: dec(item.total) });
  }

  return rows;
}

/** Column totals for summary page */
type ColumnTotals = Breakdown;

function computeColumnTotals(items: CostItem[], schedule: CostSchedule): ColumnTotals {
  const rows = computeBouw1Rows(items, schedule);
  // Only sum top-level chapters
  const totals = zeroBreakdown();
  for (const r of rows.filter(r => r.item.parentId === null && r.item.rowType === 'chapter')) {
    for (const k of Object.keys(totals) as (keyof Breakdown)[]) totals[k] = totals[k].plus(r[k]);
  }
  return totals;
}

export function buildBouw1Html(
  schedule: CostSchedule,
  items: CostItem[],
  includeActions: boolean,
  companyInfo?: CompanyInfo,
  logoDataUrl?: string,
  ctx: ReportContext = makeReportContext(),
): string {
  const fx = makeBouw1Fmt(ctx);
  const { t } = ctx;
  const today = new Date().toLocaleDateString(ctx.intlLocale, { day: '2-digit', month: '2-digit', year: 'numeric' });
  const bouw1Rows = computeBouw1Rows(items, schedule);
  const hasStaart = items.some(item => isStagartRowType(item.rowType));
  const breakdown = hasStaart ? getStaartBreakdown(items) : null;
  const colTotals = computeColumnTotals(items, schedule);

  const companyName = companyInfo?.name || t('headings.companyNamePlaceholder');
  const companyAddress = [companyInfo?.visitAddress, companyInfo?.visitCity].filter(Boolean).join(' - ');
  const companyPhone = companyInfo?.phone || '';
  const companyEmail = companyInfo?.email || '';
  const companyFax = companyInfo?.fax || '';

  const footerLine = [
    companyName,
    companyAddress,
    companyPhone ? `${t('footer.phone')} ${companyPhone}` : '',
    companyEmail ? `${t('footer.email')} ${companyEmail}` : '',
    companyFax ? `${t('footer.fax')} ${companyFax}` : '',
  ].filter(Boolean).join(' - ');

  // Build data rows grouped by chapter
  let tableRows = '';

  // Track current chapter for subtotals
  let currentTopChapter: CostItem | null = null;

  for (let idx = 0; idx < bouw1Rows.length; idx++) {
    const dr = bouw1Rows[idx];
    const item = dr.item;

    // When entering a new top-level chapter, emit subtotal for previous one
    if (item.rowType === 'chapter' && item.depth === 0) {
      if (currentTopChapter && idx > 0) {
        // Find the Bouw1Row for the current chapter to get totals
        const chapterDR = bouw1Rows.find(r => r.item.id === currentTopChapter!.id);
        if (chapterDR) {
          tableRows += buildChapterSubtotalRow(chapterDR, fx);
        }
        tableRows += '<tr class="spacer"><td colspan="18"></td></tr>';
      }
      // Repeat header at each chapter start
      tableRows += buildHeaderRow(t);
      currentTopChapter = item;
    }

    tableRows += buildDataRow(dr, fx);
  }

  // Final chapter subtotal
  if (currentTopChapter) {
    const chapterDR = bouw1Rows.find(r => r.item.id === currentTopChapter!.id);
    if (chapterDR) {
      tableRows += buildChapterSubtotalRow(chapterDR, fx);
    }
  }

  // Summary section
  // ctrl: IVA and contract total from the money policy (as in the editor), not the Dutch btw rows.
  const ivaRows = CTRL_BUILD
    ? ivaTotalsRows(schedule, items, fx.decimal, (label, amount, cls) => `
      <tr class="${cls === 'total-row' ? 'summary-total grand-total' : cls === 'subtotal-row' ? 'summary-total' : ''}">
        <td>${esc(label)}</td>
        <td></td>
        <td colspan="8" class="num total-amount">${esc(amount)}</td>
      </tr>`)
    : undefined;
  let summaryHtml = buildSummarySection(colTotals, breakdown, hasStaart, fx, ivaRows);

  const actionsHtml = includeActions
    ? `<div class="print-actions">
  <button class="print-btn" onclick="window.print()">${esc(t('actions.print'))}</button>
  <button class="close-btn" onclick="window.close()">${esc(t('actions.close'))}</button>
</div>`
    : '';

  const logoHtml = logoDataUrl
    ? `<img src="${logoDataUrl}" class="company-logo" alt="Logo" />`
    : `<div class="company-name-large">${esc(companyName)}</div>`;

  return `<!DOCTYPE html>
<html lang="${ctx.lang}">
<head>
<meta charset="UTF-8">
<title>${esc(t('views.budget'))} - ${esc(schedule.projectName || schedule.name)}</title>
<style>
${getBouw1Styles()}
</style>
</head>
<body>
${actionsHtml}
<div class="page-content">
  <div class="header">
    <div class="header-left">
      ${logoHtml}
    </div>
    <div class="header-right">
      <table class="meta-table">
        <tr><td class="meta-label">${esc(t('meta.sequenceNo'))}:</td><td class="meta-value">${esc(schedule.projectNumber || '')}</td></tr>
        <tr><td class="meta-label">${esc(t('meta.forAttentionOf'))}:</td><td class="meta-value">${esc(schedule.client || '')}</td></tr>
        <tr><td class="meta-label">${esc(t('meta.project'))}:</td><td class="meta-value">${esc(schedule.projectName || schedule.name || '')}</td></tr>
        <tr><td class="meta-label">${esc(t('meta.date'))}:</td><td class="meta-value">${today}</td></tr>
      </table>
      <div class="report-title">${esc(schedule.description || t('views.budget'))}</div>
    </div>
  </div>

  <table class="bouw1-grid">
    <thead>
      ${buildHeaderRow(t)}
    </thead>
    <tbody>
      ${tableRows}
    </tbody>
  </table>

  ${summaryHtml}
</div>
<div class="footer">
  <div class="footer-text">${esc(t('footer.terms'))}</div>
  <div class="footer-company">${esc(footerLine)}</div>
</div>
</body>
</html>`;
}

function buildHeaderRow(t: ReportContext['t']): string {
  const th = (cls: string, key: string) => `<th class="${cls}">${esc(t(key))}</th>`;
  return `<tr class="header-row">
    ${th('col-hst', 'columns.chapterShort')}
    ${th('col-par', 'columns.paragraphShort')}
    ${th('col-nr', 'columns.nr')}
    ${th('col-desc', 'columns.description')}
    ${th('col-qty', 'columns.count')}
    ${th('col-unit', 'columns.unitShort')}
    ${th('col-price', 'columns.price')}
    ${th('col-norm', 'columns.norm')}
    ${th('col-uren', 'columns.hours')}
    ${th('col-tar', 'columns.rateShort')}
    ${th('col-loon', 'columns.labour')}
    ${th('col-mat', 'columns.material')}
    ${th('col-meel', 'columns.equipment')}
    ${th('col-stel', 'columns.provisionalSum')}
    ${th('col-ond', 'columns.subcontract')}
    ${th('col-keh', 'columns.costPerUnit')}
    ${th('col-sub', 'columns.subtotal')}
    ${th('col-tot', 'columns.total')}
  </tr>`;
}

function buildDataRow(dr: Bouw1Row, fx: Bouw1Fmt): string {
  const item = dr.item;
  const fmtNL = fx.num;
  const fmtNorm = fx.norm;

  if (item.rowType === 'chapter') {
    // Chapter rows: only show hst (at depth 0) or hst+par (depth 1), plus description
    // They don't have amount columns in the Bouw1 format (totals shown separately)
    return `<tr class="chapter-row depth-${item.depth}">
      <td class="col-hst">${item.depth === 0 ? esc(dr.hst) : ''}</td>
      <td class="col-par">${item.depth >= 1 ? esc(dr.par) : ''}</td>
      <td class="col-nr"></td>
      <td class="col-desc" colspan="15">${esc(item.description)}</td>
    </tr>`;
  }

  if (item.rowType === 'tekstregel') {
    return `<tr class="text-row">
      <td class="col-hst">${esc(dr.hst)}</td>
      <td class="col-par">${esc(dr.par)}</td>
      <td class="col-nr">${esc(dr.nr)}</td>
      <td class="col-desc" colspan="15">${esc(item.description)}</td>
    </tr>`;
  }

  // Regular data row
  const indent = item.depth > 2 ? '&nbsp;'.repeat((item.depth - 2) * 3) : '';
  const tariefLabel = item.tariefGroep ?? 'A';

  // Quantity & unit
  const qty = fmtNL(item.quantity);
  const unit = fx.ctx.unit(item.unit);

  // Price column: normUnitPrice or unitPrice
  const price = item.normUnitPrice != null && dec(item.normUnitPrice).gt(0)
    ? fmtNL(item.normUnitPrice)
    : (dec(item.unitPrice).gt(0) ? fmtNL(item.unitPrice) : '');

  // Norm column
  const norm = fmtNorm(item.normFactor);

  // Uren column
  const uren = fmtNL(dr.uren);

  return `<tr class="data-row ${item.rowType}-row">
    <td class="col-hst">${esc(dr.hst)}</td>
    <td class="col-par">${esc(dr.par)}</td>
    <td class="col-nr">${esc(dr.nr)}</td>
    <td class="col-desc">${indent}${esc(item.description)}</td>
    <td class="col-qty num">${qty}</td>
    <td class="col-unit">${esc(String(unit))}</td>
    <td class="col-price num">${price}</td>
    <td class="col-norm num">${norm}</td>
    <td class="col-uren num">${uren}</td>
    <td class="col-tar">${tariefLabel}</td>
    <td class="col-loon num">${fmtNL(dr.loon)}</td>
    <td class="col-mat num">${fmtNL(dr.materiaal)}</td>
    <td class="col-meel num">${fmtNL(dr.materieel)}</td>
    <td class="col-stel num">${fmtNL(dr.stelpost)}</td>
    <td class="col-ond num">${fmtNL(dr.ondaann)}</td>
    <td class="col-keh num">${fmtNL(dr.kostenEh)}</td>
    <td class="col-sub num">${fmtNL(item.total)}</td>
    <td class="col-tot num">${fmtNL(item.total)}</td>
  </tr>`;
}

function buildChapterSubtotalRow(chapterDR: Bouw1Row, fx: Bouw1Fmt): string {
  const fmtNL = fx.num;
  return `<tr class="chapter-subtotal">
    <td colspan="8"></td>
    <td class="num">${fmtNL(chapterDR.uren)}</td>
    <td></td>
    <td class="num">${fmtNL(chapterDR.loon)}</td>
    <td class="num">${fmtNL(chapterDR.materiaal)}</td>
    <td class="num">${fmtNL(chapterDR.materieel)}</td>
    <td class="num">${fmtNL(chapterDR.stelpost)}</td>
    <td class="num">${fmtNL(chapterDR.ondaann)}</td>
    <td colspan="3"></td>
  </tr>`;
}

function buildSummarySection(
  colTotals: ColumnTotals,
  breakdown: ReturnType<typeof getStaartBreakdown> | null,
  hasStaart: boolean,
  fx: Bouw1Fmt,
  ivaRows?: string,
): string {
  const { t } = fx;
  const fmtNLForce = fx.force;
  const lbl = (key: string) => esc(t(key));
  const pctText = (v: DecimalString) => formatDecimal(v);
  const pctOf = (base: Dec, pct: DecimalString) => base.times(dec(pct)).div(100);
  const kostprijs = breakdown ? dec(breakdown.kostprijs) : colTotals.loon.plus(colTotals.materiaal).plus(colTotals.materieel).plus(colTotals.stelpost).plus(colTotals.ondaann);
  const akBasis = colTotals.loon.plus(colTotals.materiaal).plus(colTotals.materieel);

  // Opslag-percentages én -bedragen komen uit de staart-breakdown: die is
  // afgeleid uit de daadwerkelijke staart-items (dus inclusief door de
  // gebruiker aangepaste percentages). Alleen als er geen staart is
  // (breakdown === null) vallen we terug op de standaard-percentages.

  // AK over onderaanneming
  const akOndPct = breakdown?.akOaPercentage ?? '9';
  const akOndAmount = breakdown ? dec(breakdown.akOaAmount) : pctOf(colTotals.ondaann, akOndPct);

  // Algemene bedrijfskosten (over loon + materiaal + materieel)
  const akPct = breakdown?.abkPercentage ?? '6';
  const akAmount = breakdown ? dec(breakdown.abkAmount) : pctOf(akBasis, akPct);

  // Garanties
  const garantiePct = breakdown?.garantiesPercentage ?? '2';
  const garantieAmount = breakdown ? dec(breakdown.garantiesAmount) : pctOf(akBasis, garantiePct);

  // Werkvoorbereiding & projectmanagement
  const wvPct = breakdown?.wvpmPercentage ?? '2';
  const wvAmount = breakdown ? dec(breakdown.wvpmAmount) : pctOf(akBasis, wvPct);

  const totaalKostprijs = breakdown ? dec(breakdown.kostprijsBouw1) : kostprijs.plus(akOndAmount).plus(akAmount).plus(garantieAmount).plus(wvAmount);

  // Risico, winst, verzekering
  const risicoPct = breakdown?.risicoPercentage ?? '3';
  const winstPct = breakdown?.winstPercentage ?? '5';
  const verzekeringPct = breakdown?.verzekeringPercentage ?? '0.5';

  const risico = breakdown ? dec(breakdown.risicoAmount) : pctOf(totaalKostprijs, risicoPct);
  const winst = breakdown ? dec(breakdown.winstAmount) : pctOf(totaalKostprijs, winstPct);
  const verzekering = breakdown ? dec(breakdown.verzekeringAmount) : pctOf(totaalKostprijs, verzekeringPct);

  const totaalExclBtw = breakdown ? dec(breakdown.aanneemsomExcl) : totaalKostprijs.plus(risico).plus(winst).plus(verzekering);
  const btwPct = breakdown?.btwPercentage ?? '21';
  const opslagFactor = dec(akPct).plus(dec(garantiePct)).plus(dec(wvPct)).div(100).plus(1);

  return `
  <div class="summary-section">
    <div class="page-break"></div>

    <h3 class="summary-title">${lbl('summary.title')}</h3>

    <table class="summary-table">
      <tr class="summary-header">
        <th class="s-desc">${lbl('columns.description')}</th>
        <th class="s-pct">%</th>
        <th class="s-loon">${lbl('columns.labour')}</th>
        <th class="s-mat">${lbl('columns.material')}</th>
        <th class="s-meel">${lbl('columns.equipment')}</th>
        <th class="s-stel">${lbl('columns.provisionalSum')}</th>
        <th class="s-ond">${lbl('columns.subcontract')}</th>
        <th class="s-bedrag">${lbl('columns.amount')}</th>
        <th class="s-post">${lbl('columns.post')}</th>
        <th class="s-tot">${lbl('columns.total')}</th>
      </tr>

      <tr>
        <td>${lbl('summary.columnTotals')}</td>
        <td></td>
        <td class="num">${fmtNLForce(colTotals.loon)}</td>
        <td class="num">${fmtNLForce(colTotals.materiaal)}</td>
        <td class="num">${fmtNLForce(colTotals.materieel)}</td>
        <td class="num">${fmtNLForce(colTotals.stelpost)}</td>
        <td class="num">${fmtNLForce(colTotals.ondaann)}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.overheadSubcontract')}</td>
        <td class="num">${pctText(akOndPct)} %</td>
        <td></td><td></td><td></td><td></td>
        <td class="num">${fmtNLForce(akOndAmount)}</td>
        <td></td>
        <td class="num">${fmtNLForce(akOndAmount)}</td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.generalOverhead')}</td>
        <td class="num">${pctText(akPct)} %</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.loon, akPct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materiaal, akPct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materieel, akPct))}</td>
        <td></td><td></td>
        <td class="num">${fmtNLForce(akAmount)}</td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.guarantees')}</td>
        <td class="num">${pctText(garantiePct)} %</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.loon, garantiePct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materiaal, garantiePct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materieel, garantiePct))}</td>
        <td></td><td></td>
        <td class="num">${fmtNLForce(garantieAmount)}</td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.preparation')}</td>
        <td class="num">${pctText(wvPct)} %</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.loon, wvPct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materiaal, wvPct))}</td>
        <td class="num">${fmtNLForce(pctOf(colTotals.materieel, wvPct))}</td>
        <td></td><td></td>
        <td class="num">${fmtNLForce(wvAmount)}</td>
        <td></td>
        <td></td>
      </tr>

      <tr class="summary-kostprijs">
        <td>${lbl('summary.totalCostPrice')}</td>
        <td></td>
        <td class="num">${fmtNLForce(colTotals.loon.times(opslagFactor))}</td>
        <td class="num">${fmtNLForce(colTotals.materiaal.times(opslagFactor))}</td>
        <td class="num">${fmtNLForce(colTotals.materieel.times(opslagFactor))}</td>
        <td class="num">${fmtNLForce(colTotals.stelpost)}</td>
        <td class="num">${fmtNLForce(colTotals.ondaann.plus(akOndAmount))}</td>
        <td></td>
        <td></td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.risk')}</td>
        <td class="num">${pctText(risicoPct)} %</td>
        <td colspan="4"></td>
        <td></td>
        <td class="num">${fmtNLForce(totaalKostprijs)}</td>
        <td class="num">${fmtNLForce(risico)}</td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.profit')}</td>
        <td class="num">${pctText(winstPct)} %</td>
        <td colspan="4"></td>
        <td></td>
        <td class="num">${fmtNLForce(totaalKostprijs)}</td>
        <td class="num">${fmtNLForce(winst)}</td>
        <td></td>
      </tr>

      <tr>
        <td>${lbl('summary.insurance')}</td>
        <td class="num">${pctText(verzekeringPct)} %</td>
        <td colspan="4"></td>
        <td></td>
        <td class="num">${fmtNLForce(totaalKostprijs)}</td>
        <td class="num">${fmtNLForce(verzekering)}</td>
        <td></td>
      </tr>

      ${ivaRows !== undefined ? ivaRows : (() => {
        // Excl-eindbedrag (incl. afronding); btw uit de breakdown zodat de
        // hoog/laag-verdeling van de staart-items 1-op-1 wordt overgenomen.
        const exclEind = hasStaart && breakdown
          ? dec(breakdown.aanneemsomExcl).plus(dec(breakdown.afronding))
          : totaalExclBtw;
        const btwLaagGrondslag = dec(breakdown?.btwLaagGrondslag);
        const btwLaagPct = breakdown?.btwLaagPercentage ?? '9';
        const btwLaag = dec(breakdown?.btwLaagAmount);
        const btwGrondslag = hasStaart && breakdown ? dec(breakdown.btwGrondslag) : exclEind;
        const btwHoog = hasStaart && breakdown ? dec(breakdown.btwAmount) : pctOf(exclEind, btwPct);
        const btwLaagRow = btwLaagGrondslag.gt(0) ? `
      <tr>
        <td>${lbl('summary.vatLow')}</td>
        <td class="num">${pctText(btwLaagPct)} %</td>
        <td colspan="5"></td>
        <td class="num">${fmtNLForce(btwLaagGrondslag)}</td>
        <td class="num">${fmtNLForce(btwLaag)}</td>
        <td></td>
      </tr>` : '';
        return `
      <tr class="summary-total">
        <td>${lbl('summary.totalExclVat')}</td>
        <td></td>
        <td colspan="8" class="num total-amount">${fmtNLForce(exclEind)}</td>
      </tr>
      ${btwLaagRow}
      <tr>
        <td>${lbl('summary.vatHigh')}</td>
        <td class="num">${pctText(btwPct)} %</td>
        <td colspan="5"></td>
        <td class="num">${fmtNLForce(btwGrondslag)}</td>
        <td class="num">${fmtNLForce(btwHoog)}</td>
        <td></td>
      </tr>

      <tr class="summary-total grand-total">
        <td>${lbl('summary.totalInclVat')}</td>
        <td></td>
        <td colspan="8" class="num total-amount">${fmtNLForce(exclEind.plus(btwHoog).plus(btwLaag))}</td>
      </tr>`;
      })()}
    </table>
  </div>`;
}

function getBouw1Styles(): string {
  return `
/* OpenAEC Style Book â€” Design Tokens */
@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;700&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400&display=swap');

:root {
  --oaec-accent: #D97706;
  --oaec-accent-hover: #EA580C;
  --oaec-highlight: #F59E0B;
  --oaec-text: #36363E;
  --oaec-text-secondary: #A1A1AA;
  --oaec-bg: #FAFAF9;
  --oaec-surface: #F5F5F4;
  --oaec-dark: #2A2A32;
  --oaec-success: #16A34A;
  --oaec-border: #E7E5E4;
  --oaec-border-strong: #A8A29E;
  --oaec-radius: 8px;
  --oaec-shadow-sm: 0 1px 2px rgba(0,0,0,0.05);
  --oaec-shadow-md: 0 4px 6px -1px rgba(0,0,0,0.1);
}

@page {
  size: A4 landscape;
  margin: 10mm 8mm 14mm 8mm;
  @bottom-right { content: counter(page) " / " counter(pages); font-family: 'Inter', sans-serif; font-size: 7pt; color: var(--oaec-text-secondary); }
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'Inter', 'Segoe UI', sans-serif;
  font-size: 7.5pt;
  color: var(--oaec-text);
  line-height: 1.4;
  padding: 6mm;
  background: white;
}

/* Action buttons â€” OpenAEC amber primary */
.print-actions { position: fixed; top: 12px; right: 12px; display: flex; gap: 8px; z-index: 1000; }
.print-btn {
  padding: 8px 24px; background: var(--oaec-accent); color: white; border: none;
  border-radius: var(--oaec-radius); cursor: pointer; font-family: 'Inter', sans-serif;
  font-size: 10pt; font-weight: 600; transition: background 0.15s ease;
  box-shadow: var(--oaec-shadow-sm);
}
.print-btn:hover { background: var(--oaec-accent-hover); box-shadow: var(--oaec-shadow-md); }
.close-btn {
  padding: 8px 24px; background: transparent; color: var(--oaec-text); border: 1.5px solid var(--oaec-border-strong);
  border-radius: var(--oaec-radius); cursor: pointer; font-family: 'Inter', sans-serif;
  font-size: 10pt; font-weight: 500; transition: all 0.15s ease;
}
.close-btn:hover { background: var(--oaec-surface); border-color: var(--oaec-text); }

/* Header */
.header { display: flex; justify-content: space-between; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 2px solid var(--oaec-accent); }
.header-left { display: flex; align-items: flex-start; }
.company-logo { max-height: 48px; max-width: 200px; }
.company-name-large { font-family: 'Space Grotesk', sans-serif; font-size: 16pt; font-weight: 700; color: var(--oaec-text); padding-top: 4px; }
.header-right { text-align: left; }
.meta-table { font-size: 7.5pt; border-collapse: collapse; }
.meta-table td { padding: 0 8px 2px 0; }
.meta-label { color: var(--oaec-text-secondary); font-weight: 500; text-transform: uppercase; font-size: 6.5pt; letter-spacing: 0.3px; }
.meta-value { color: var(--oaec-text); font-weight: 500; }
.report-title { font-family: 'Space Grotesk', sans-serif; font-weight: 700; font-size: 9pt; margin-top: 4px; color: var(--oaec-text); }

/* Main grid */
.bouw1-grid {
  width: 100%;
  border-collapse: collapse;
  font-size: 7pt;
  table-layout: fixed;
}
.bouw1-grid thead { display: table-header-group; }
.bouw1-grid tbody tr { page-break-inside: avoid; break-inside: avoid; }
.chapter-row { page-break-after: avoid; break-after: avoid; }
.chapter-subtotal { page-break-before: avoid; break-before: avoid; }

.bouw1-grid th, .bouw1-grid td {
  padding: 2px 3px;
  vertical-align: top;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

/* Column widths (landscape A4 ~ 277mm printable = ~785pt) */
.col-hst { width: 22px; text-align: left; }
.col-par { width: 22px; text-align: left; }
.col-nr { width: 22px; text-align: left; }
.col-desc { width: auto; text-align: left; white-space: normal; word-wrap: break-word; }
.col-qty { width: 42px; text-align: right; }
.col-unit { width: 22px; text-align: center; }
.col-price { width: 52px; text-align: right; }
.col-norm { width: 36px; text-align: right; }
.col-uren { width: 42px; text-align: right; }
.col-tar { width: 18px; text-align: center; }
.col-loon { width: 56px; text-align: right; }
.col-mat { width: 56px; text-align: right; }
.col-meel { width: 52px; text-align: right; }
.col-stel { width: 52px; text-align: right; }
.col-ond { width: 52px; text-align: right; }
.col-keh { width: 52px; text-align: right; }
.col-sub { width: 56px; text-align: right; }
.col-tot { width: 56px; text-align: right; }

.num { text-align: right; font-variant-numeric: tabular-nums; }

/* Header row â€” amber accent stripe */
.header-row th {
  background: linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%);
  border-top: 2px solid var(--oaec-accent);
  border-bottom: 1px solid var(--oaec-accent);
  font-weight: 600;
  font-size: 6.5pt;
  padding: 3px 3px;
  text-align: left;
  color: var(--oaec-text);
  text-transform: uppercase;
  letter-spacing: 0.2px;
}
.header-row th.col-qty,
.header-row th.col-price,
.header-row th.col-norm,
.header-row th.col-uren,
.header-row th.col-loon,
.header-row th.col-mat,
.header-row th.col-meel,
.header-row th.col-stel,
.header-row th.col-ond,
.header-row th.col-keh,
.header-row th.col-sub,
.header-row th.col-tot { text-align: right; }
.header-row th.col-unit,
.header-row th.col-tar { text-align: center; }

/* Chapter rows */
.chapter-row td {
  font-family: 'Space Grotesk', sans-serif;
  font-weight: 700;
  padding-top: 4px;
  padding-bottom: 2px;
  color: var(--oaec-text);
}
.chapter-row.depth-0 td { font-size: 8pt; }
.chapter-row.depth-1 td { font-size: 7.5pt; padding-left: 8px; }
.chapter-row.depth-2 td { font-size: 7pt; font-weight: 600; padding-left: 16px; }

/* Data rows */
.data-row td { border-bottom: none; }
.data-row:hover td { background: #FFFBEB; }

/* Text rows */
.text-row td { font-style: italic; color: var(--oaec-text-secondary); }

/* Chapter subtotal */
.chapter-subtotal td {
  border-top: 1.5px solid var(--oaec-accent);
  font-weight: 600;
  padding-top: 3px;
  padding-bottom: 3px;
  color: var(--oaec-text);
}

/* Spacer between chapters */
.spacer td { height: 8px; border: none; }

/* Footer */
.footer {
  margin-top: 16px;
  padding-top: 6px;
  border-top: 1px solid var(--oaec-border);
  font-size: 6pt;
  color: var(--oaec-text-secondary);
}
.footer-text { margin-bottom: 2px; }
.footer-company { font-weight: 500; }

/* Summary section */
.page-break { page-break-before: always; }
.summary-section { margin-top: 24px; }
.summary-title { font-family: 'Space Grotesk', sans-serif; font-size: 11pt; font-weight: 700; margin-bottom: 12px; color: var(--oaec-text); border-bottom: 2px solid var(--oaec-accent); padding-bottom: 4px; display: inline-block; }

.summary-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 7.5pt;
}
.summary-table th, .summary-table td {
  padding: 3px 6px;
  vertical-align: top;
}
.summary-header th {
  background: linear-gradient(180deg, #FEF3C7 0%, #FDE68A 100%);
  border-top: 2px solid var(--oaec-accent);
  border-bottom: 1px solid var(--oaec-accent);
  font-weight: 600;
  text-align: left;
  font-size: 7pt;
  text-transform: uppercase;
  letter-spacing: 0.2px;
  color: var(--oaec-text);
}
.summary-header th.num,
.s-loon, .s-mat, .s-meel, .s-stel, .s-ond, .s-bedrag, .s-post, .s-tot { text-align: right; }
.s-pct { text-align: right; width: 40px; }
.s-desc { width: auto; }
.s-loon { width: 70px; }
.s-mat { width: 70px; }
.s-meel { width: 60px; }
.s-stel { width: 60px; }
.s-ond { width: 70px; }
.s-bedrag { width: 70px; }
.s-post { width: 70px; }
.s-tot { width: 80px; }

.summary-kostprijs td {
  border-top: 1.5px solid var(--oaec-accent);
  font-weight: 600;
}
.summary-total td {
  border-top: 2px solid var(--oaec-text);
  font-weight: 700;
  font-size: 8.5pt;
  padding-top: 6px;
}
.grand-total td {
  border-top: 3px double var(--oaec-accent);
  font-size: 9pt;
  color: var(--oaec-text);
}
.total-amount { font-weight: 700; }

@media print {
  .print-actions { display: none; }
  body { padding: 0; }
  thead { display: table-header-group; }
  tr { page-break-inside: avoid; }
}
`;
}
