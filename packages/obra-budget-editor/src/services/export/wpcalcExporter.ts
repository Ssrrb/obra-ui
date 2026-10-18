/**
 * WPCalc (.calc) exporter
 *
 * Exports the app's internal data model to a WPCalc-compatible Access MDB file.
 * This requires the Tauri backend (Windows only) since MDB writing uses ODBC via PowerShell.
 *
 * The Rust Tauri command:
 * 1. Copies an embedded empty .calc MDB template to the target path
 * 2. Populates all tables (calculaties, data, staart, tarieven) via ADO/OLEDB
 */

import type { CostItem, CostSchedule, CompanyInfo } from '@/types/costModel';
import { isTauriEnvironment } from '@/services/file/nativeFileService';
import { toNumber } from '@/utils/decimal';

/**
 * Export the current budget as a WPCalc .calc file.
 * Returns the saved file path, or null if cancelled.
 */
export async function exportWpCalcFile(
  schedule: CostSchedule,
  items: CostItem[],
  companyInfo?: CompanyInfo | null,
): Promise<string | null> {
  if (!isTauriEnvironment()) {
    throw new Error('WPCalc export is only available in the desktop app (requires Access OLEDB driver).');
  }

  // Show save dialog
  const { save } = await import('@tauri-apps/plugin-dialog');
  const outputPath = await save({
    filters: [{ name: 'WPCalc', extensions: ['calc'] }],
    defaultPath: `${schedule.projectName || schedule.name || 'begroting'}.calc`,
  });

  if (!outputPath) return null;

  // Build the export request matching the Rust struct
  const request = buildExportRequest(schedule, items, companyInfo);

  // Invoke the Tauri command
  const { invoke } = await import('@tauri-apps/api/core');
  await invoke('export_wpcalc', {
    request,
    outputPath,
  });

  return outputPath;
}

/**
 * Transform the app's data model into the WpCalcExportRequest format
 * expected by the Rust backend.
 */
function buildExportRequest(
  schedule: CostSchedule,
  items: CostItem[],
  companyInfo?: CompanyInfo | null,
) {
  return {
    schedule: {
      name: schedule.name || '',
      projectName: schedule.projectName || '',
      projectNumber: schedule.projectNumber || '',
      client: schedule.client || '',
      author: schedule.author || '',
      description: schedule.description || '',
      algemeneKosten: toNumber(schedule.algemeneKosten),
      winstRisico: toNumber(schedule.winstRisico),
      tarieven: schedule.tarieven ? Object.fromEntries(Object.entries(schedule.tarieven).map(([k, v]) => [k, toNumber(v)])) : null,
      staartRows: schedule.staartRows
        ? schedule.staartRows.map((r) => Object.fromEntries(Object.entries(r).map(([k, v]) => [k, typeof v === "string" ? toNumber(v) : v])))
        : null,
    },
    items: items
      .filter((item) => !item.rowType.startsWith('staart_'))
      .map((item) => ({
        id: item.id,
        code: item.code || '',
        description: item.description || '',
        rowType: item.rowType,
        quantity: item.quantity == null ? null : toNumber(item.quantity),
        unit: item.unit || 'st',
        unitPrice: toNumber(item.unitPrice),
        total: toNumber(item.total),
        materialPrice: item.materialPrice == null ? null : toNumber(item.materialPrice),
        laborPrice: item.laborPrice == null ? null : toNumber(item.laborPrice),
        depth: item.depth || 0,
        parentId: item.parentId,
        sortOrder: item.sortOrder || 0,
        resourceType: item.resourceType,
        tariefGroep: item.tariefGroep,
        normQuantity: item.normQuantity == null ? null : toNumber(item.normQuantity),
        normUnitPrice: item.normUnitPrice == null ? null : toNumber(item.normUnitPrice),
      })),
    companyInfo: companyInfo
      ? {
          name: companyInfo.name || '',
          postalAddress: companyInfo.postalAddress || '',
          postalCity: companyInfo.postalCity || '',
        }
      : null,
  };
}
