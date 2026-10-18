/** Motor de importación de presupuestos (portado de SISTEMA-DE-CONTROL-OBRAS). */
export * from "./types.js";
export { cleanText, isNoCotiza, parseFlexibleNumber, detectNumberFormat, getColumnLetter, extractFromPastedText, buildGoogleSheetsExportUrl } from "./matrixExtractor.js";
export type { ExtractedSheetMatrix, ExtractedWorkbook, MergeRange } from "./matrixExtractor.js";
export { extractFromBuffer } from "./xlsxWorkbook.js";
export { analyzeSheetStructure, detectHeaderRow, matchRoleKeyword, roleColumns } from "./columnAnalyzer.js";
export { classifySheetRows, isSubtotalText } from "./rowClassifier.js";
export { normalizeUnit } from "./unitNormalizer.js";
export { buildBudgetTree, defaultSurchargeTreatment, AREA_PATTERN } from "./budgetTree.js";
export { generatePreview } from "./preview.js";
