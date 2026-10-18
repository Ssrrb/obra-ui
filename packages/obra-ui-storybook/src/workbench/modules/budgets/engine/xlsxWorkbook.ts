/**
 * Lectura de libros XLSX/XLS/CSV con la librería `xlsx`.
 *
 * Portado de `SISTEMA-DE-CONTROL-OBRAS/src/modules/budgets/engine/matrixExtractor.ts`
 * (parte dependiente de la librería). Separada del módulo de texto puro para que el
 * resto del motor no arrastre a `xlsx` cuando la fuente es texto pegado.
 *
 * En el navegador (preview del workbench) el bundler resuelve `xlsx`; en Node
 * los tests lo importan directo.
 */
import * as XLSX from "xlsx";
import type { ExtractedSheetMatrix, ExtractedWorkbook, MergeRange } from "./matrixExtractor.js";

function worksheetToSheetMatrix(ws: XLSX.WorkSheet, sheetName: string): ExtractedSheetMatrix {
  let maxRow = -1;
  let maxCol = -1;
  let formulasWithoutValue = 0;

  for (const key in ws) {
    if (!Object.prototype.hasOwnProperty.call(ws, key)) continue;
    if (key.startsWith("!")) continue;
    try {
      const cell = XLSX.utils.decode_cell(key);
      if (cell.r > maxRow) maxRow = cell.r;
      if (cell.c > maxCol) maxCol = cell.c;
    } catch {
      // celda con clave inválida: se ignora
    }
  }
  if (ws["!ref"]) {
    try {
      const decoded = XLSX.utils.decode_range(ws["!ref"]);
      maxRow = Math.max(maxRow, decoded.e.r);
      maxCol = Math.max(maxCol, decoded.e.c);
    } catch {
      // !ref inválido: se conserva lo medido celda por celda
    }
  }

  const matrix: unknown[][] = [];
  for (let r = 0; r <= maxRow; r++) {
    const row: unknown[] = [];
    for (let c = 0; c <= maxCol; c++) {
      const cellObj = ws[XLSX.utils.encode_cell({ r, c })] as XLSX.CellObject | undefined;
      let val: unknown = "";
      if (cellObj) {
        if (cellObj.v !== undefined && cellObj.v !== null) {
          val = cellObj.v;
        } else if (cellObj.w !== undefined) {
          val = cellObj.w;
        } else if (cellObj.f) {
          formulasWithoutValue++;
        }
      }
      row.push(val);
    }
    matrix.push(row);
  }

  const merges: MergeRange[] = (ws["!merges"] || []).map((m) => ({ s: { ...m.s }, e: { ...m.e } }));
  for (const m of merges) {
    if (m.e.r <= m.s.r) continue;
    const origin = matrix[m.s.r]?.[m.s.c];
    if (origin === "" || origin === undefined) continue;
    for (let r = m.s.r + 1; r <= m.e.r && r < matrix.length; r++) {
      if (matrix[r][m.s.c] === "" || matrix[r][m.s.c] === undefined) matrix[r][m.s.c] = origin;
    }
  }

  const hiddenRows: number[] = [];
  (ws["!rows"] as { hidden?: boolean }[] | undefined)?.forEach((info, idx) => {
    if (info?.hidden) hiddenRows.push(idx);
  });
  const hiddenCols: number[] = [];
  (ws["!cols"] as { hidden?: boolean }[] | undefined)?.forEach((info, idx) => {
    if (info?.hidden) hiddenCols.push(idx);
  });

  return {
    sheetName,
    matrix,
    maxRows: matrix.length,
    maxCols: maxCol + 1,
    merges,
    hiddenRows,
    hiddenCols,
    formulasWithoutValue,
  };
}

/** Extrae un libro completo desde bytes (XLSX, XLS, CSV). */
export function extractFromBuffer(buffer: ArrayBuffer | Uint8Array, originalName?: string): ExtractedWorkbook {
  const wb = XLSX.read(buffer, {
    type: "array",
    cellDates: true,
    cellStyles: true, // necesario para leer filas/columnas ocultas
    raw: false,
  });

  const sheets: ExtractedSheetMatrix[] = [];
  for (const sheetName of wb.SheetNames) {
    const ws = wb.Sheets[sheetName];
    if (!ws) continue;
    const sheet = worksheetToSheetMatrix(ws, sheetName);
    if (sheet.matrix.length === 0) continue;
    sheets.push(sheet);
  }

  return {
    sheets,
    fileName: originalName || "presupuesto.xlsx",
    sourceType: originalName?.toLowerCase().endsWith(".csv") ? "CSV" : "EXCEL",
  };
}
