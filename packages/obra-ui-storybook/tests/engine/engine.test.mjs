// Tests del motor de importación de presupuestos.
//
// Portado de `SISTEMA-DE-CONTROL-OBRAS/src/modules/budgets/engine/__tests__/importer.test.ts`
// (vitest → `node --test`). Ejecutan el JS compilado por `pnpm test:engine`
// (`tsconfig.engine.json` → `dist-engine/`), la misma convención que `@obra/ui`.
//
// Regresión con planilla real: `BUDGET_FIXTURE=/ruta/pruebacerterp.xlsx` corre solo
// si el archivo existe (no se versiona).
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import { createRequire } from "node:module";
import {
  buildBudgetTree,
  detectNumberFormat,
  extractFromBuffer,
  extractFromPastedText,
  generatePreview,
  parseFlexibleNumber,
} from "../../dist-engine/index.js";

const require = createRequire(import.meta.url);
const XLSX = require("xlsx");

const HEADER = ["Item", "Descripción", "Unidad", "Cantidad", "Precio Unitario", "Precio Total"];

function workbook(specs) {
  const wb = XLSX.utils.book_new();
  for (const spec of specs) {
    const ws = XLSX.utils.aoa_to_sheet(spec.rows);
    if (spec.merges) ws["!merges"] = spec.merges;
    if (spec.hiddenRows) {
      ws["!rows"] = [];
      for (const r of spec.hiddenRows) ws["!rows"][r] = { hidden: true };
    }
    XLSX.utils.book_append_sheet(wb, ws, spec.name);
  }
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx", cellStyles: true });
  return extractFromBuffer(new Uint8Array(buffer), "presupuesto.xlsx");
}

const items = (preview) => preview.build.nodes.filter((n) => n.kind === "ITEM");

describe("lectura de números", () => {
  it("respeta el formato paraguayo (coma decimal)", () => {
    assert.equal(parseFlexibleNumber("12,5", "PY"), 12.5);
    assert.equal(parseFlexibleNumber("1.500.000", "PY"), 1500000);
    assert.equal(parseFlexibleNumber("1.500", "PY"), 1500);
    assert.equal(parseFlexibleNumber("1.234.567,89", "PY"), 1234567.89);
    assert.equal(parseFlexibleNumber("Gs. 250.000", "PY"), 250000);
    assert.equal(parseFlexibleNumber("(1.500)", "PY"), -1500);
  });

  it("respeta el formato inglés", () => {
    assert.equal(parseFlexibleNumber("1,234,567.89", "EN"), 1234567.89);
    assert.equal(parseFlexibleNumber("12.5", "EN"), 12.5);
  });

  it("no convierte textos con letras en números", () => {
    assert.equal(parseFlexibleNumber("12,5 m3", "PY"), null);
    assert.equal(parseFlexibleNumber("Bloque 3", "PY"), null);
    assert.equal(parseFlexibleNumber("No cotiza", "PY"), null);
  });

  it("detecta el formato del texto pegado", () => {
    const wb = extractFromPastedText("Desc\tCant\tPU\nA\t12,5\t1.500.000\nB\t3,25\t2.000");
    assert.equal(detectNumberFormat(wb.sheets), "PY");
  });
});

describe("clasificación y jerarquía", () => {
  it("no pisa ítems cuando la numeración reinicia en cada rubro", () => {
    const preview = generatePreview(
      workbook([
        {
          name: "Presupuesto",
          rows: [
            HEADER,
            [1, "TRABAJOS PRELIMINARES"],
            [1, "Replanteo", "m2", 100, 5000, 500000],
            [2, "Limpieza de terreno", "m2", 100, 3000, 300000],
            [2, "FUNDACIONES"],
            [1, "Excavación", "m3", 50, 40000, 2000000],
            [2, "Hormigón de cimientos", "m3", 10, 1000000, 10000000],
            ["", "TOTAL GENERAL", "", "", "", 12800000],
          ],
        },
      ])
    );
    const { nodes, reconciliation, counts } = preview.build;

    assert.equal(counts.rubros, 2);
    assert.equal(counts.items, 4);
    assert.equal(new Set(nodes.map((n) => n.path)).size, nodes.length);
    const excavacion = nodes.find((n) => n.name === "Excavación");
    assert.ok(excavacion);
    assert.equal(excavacion.parentPath, nodes.find((n) => n.name === "FUNDACIONES").path);
    assert.equal(reconciliation.itemsTotal, 12800000);
    assert.equal(reconciliation.declaredGrandTotal, 12800000);
    assert.equal(reconciliation.balanced, true);
    assert.equal(preview.build.issues.filter((i) => i.type === "CRITICAL").length, 0);
  });

  it("no cuenta dos veces el subtotal de un rubro ni asume cantidad 1", () => {
    const { build } = generatePreview(
      workbook([
        {
          name: "Obra",
          rows: [
            HEADER,
            ["1", "ESTRUCTURA", "", "", "", 1500000],
            ["1.1", "Columnas", "m3", 1, 1000000, 1000000],
            ["1.2", "Vigas", "m3", 1, 500000, 500000],
            ["2", "LIMPIEZA FINAL DE OBRA", "", "", "", 200000],
          ],
        },
      ])
    );

    assert.equal(build.reconciliation.itemsTotal, 1700000);
    const estructura = build.nodes.find((n) => n.name === "ESTRUCTURA");
    assert.ok(estructura);
    assert.equal(estructura.kind, "RUBRO");
    assert.equal(estructura.amount, 1500000);
    assert.equal(build.reconciliation.rubroChecks.find((c) => c.name === "ESTRUCTURA")?.difference, 0);

    // Título sin ítems pero con monto → partida global
    const limpieza = build.nodes.find((n) => n.name === "LIMPIEZA FINAL DE OBRA");
    assert.ok(limpieza);
    assert.equal(limpieza.kind, "ITEM");
    assert.equal(limpieza.unit, "gl");
    assert.equal(limpieza.amount, 200000);
  });

  it("marca el descuadre entre el subtotal de la planilla y la suma de ítems", () => {
    const { build } = generatePreview(
      workbook([
        {
          name: "Obra",
          rows: [
            HEADER,
            ["1", "ALBAÑILERÍA", "", "", "", 999999],
            ["1.1", "Muro de ladrillo", "m2", 10, 50000, 500000],
          ],
        },
      ])
    );
    assert.equal(build.reconciliation.balanced, false);
    assert.ok(build.issues.some((i) => i.category === "RECONCILIATION"));
  });

  it("detecta rubros sin código y subrubros anidados", () => {
    const { build } = generatePreview(
      workbook([
        {
          name: "Obra",
          rows: [
            HEADER,
            ["", "OBRAS CIVILES"],
            ["", "Mampostería"],
            ["a", "Muro 0,15", "m2", 20, 60000, 1200000],
            ["b", "Muro 0,30", "m2", 10, 90000, 900000],
            ["", "Revoques"],
            ["a", "Revoque interior", "m2", 30, 25000, 750000],
          ],
        },
      ])
    );
    const obras = build.nodes.find((n) => n.name === "OBRAS CIVILES");
    const mamposteria = build.nodes.find((n) => n.name === "Mampostería");
    const revoques = build.nodes.find((n) => n.name === "Revoques");
    assert.ok(obras && mamposteria && revoques);
    assert.equal(obras.level, 0);
    assert.equal(mamposteria.parentPath, obras.path);
    assert.equal(revoques.parentPath, obras.path);
    assert.equal(obras.amount, 2850000);
  });

  it("importa códigos duplicados dentro del mismo rubro con advertencia y clave propia", () => {
    const { build } = generatePreview(
      workbook([
        {
          name: "Obra",
          rows: [
            HEADER,
            ["1", "RUBRO"],
            ["1.1", "Ítem A", "un", 1, 100, 100],
            ["1.1", "Ítem B", "un", 1, 200, 200],
          ],
        },
      ])
    );
    assert.ok(build.issues.some((i) => i.type === "WARNING" && i.category === "DUPLICATE_CODE"));
    assert.equal(build.issues.filter((i) => i.type === "CRITICAL").length, 0);
    assert.equal(new Set(build.nodes.map((n) => n.path)).size, build.nodes.length);
    assert.equal(build.reconciliation.itemsTotal, 300);
  });
});

describe("planillas por áreas (estructura tipo licitación)", () => {
  // Réplica reducida de la estructura de pruebacerterp.xlsx: áreas y bloques escritos en la
  // columna de código, numeración que reinicia en cada bloque, etiquetas B.N., subtítulos,
  // títulos con =F*D que da 0, ítems con PU 0 y un código repetido.
  const rows = [
    HEADER,
    ["Área: 1) OBRADOR", "", "", "", "", 0],
    ["1.1", "OBRADORES", "", "", "", 0],
    ["1.1.1", "Obrador", "m²", 10, 1000, 10000],
    ["Área: 2) BLOQUE 6 - AULAS", "", "", "", "", 0],
    ["", "ESTRUCTURA DE HORMIGÓN ARMADO", "", "", "", 0],
    [1, "Trabajos preliminares", "", "", "", 0],
    ["1.1", "Limpieza y desbroce", "gl", 1, 0, 0],
    ["1.2", "Replanteo", "gl", 1, 5000, 5000],
    [2, "Fundaciones", "", "", "", 0],
    ["2.1", "Pilotes", "m", 10, 2000, 20000],
    ["", "", "", "", "", 0],
    ["PLANTA DE CONJUNTO - PLANTA BAJA", "", "", "", "", 0],
    [1, "SERVICIOS PRELIMINARES", "", "", "", 0],
    ["B.N.", "BLOQUES NUEVOS", "", "", "", 0],
    ["1.1", "Limpieza de terreno", "m²", 100, 50, 5000],
    [6, "ABERTURAS", "", "", "", 0],
    ["B.N.", "BLOQUES NUEVOS", "", "", "", 0],
    ["", "PUERTAS", "", "", "", 0],
    ["6.1", "Puerta placa", "un", 2, 1000, 2000],
    ["", "VENTANAS", "", "", "", 0],
    ["6.2", "Ventana aluminio", "un", 2, 1500, 3000],
    ["6.2", "Ventana aluminio grande", "un", 1, 2500, 2500],
    ["PLANTA DE CONJUNTO - PLANTA NIVEL 1", "", "", "", "", 0],
    [1, "SERVICIOS PRELIMINARES", "", "", "", 0],
    ["1.1", "Replanteo nivel 1", "m²", 10, 100, 1000],
    ["Área: 3) PCI - COMBATE", "", "", "", "", 0],
    ["", "Boca de Incendio Siamesa", "", "", "", 0],
    [1, "Boca siamesa", "un", 1, 3000, 3000],
    ["Rociadores", "", "", "", "", 0],
    [2, "Rociador pendiente", "un", 10, 100, 1000],
  ];

  it("arma la jerarquía por contexto y cuadra sin errores críticos", () => {
    const { build } = generatePreview(workbook([{ name: "Hoja1", rows }]));
    const byName = (name) => build.nodes.find((n) => n.name === name);

    assert.equal(build.issues.filter((i) => i.type === "CRITICAL").length, 0);
    assert.equal(build.reconciliation.balanced, true);
    assert.equal(build.reconciliation.itemsTotal, 52500);
    assert.equal(build.reconciliation.rubroChecks.length, 0); // títulos con total 0 no declaran subtotal

    // Áreas en nivel 0 con clave A{n}
    const areas = build.nodes.filter((n) => n.level === 0);
    assert.deepEqual(areas.map((n) => n.path), ["A1", "A2", "A3"]);

    // Bloques del área (el título en la columna de código se toma como descripción)
    assert.equal(byName("ESTRUCTURA DE HORMIGÓN ARMADO").parentPath, "A2");
    assert.equal(byName("PLANTA DE CONJUNTO - PLANTA BAJA").parentPath, "A2");
    assert.equal(byName("PLANTA DE CONJUNTO - PLANTA NIVEL 1").parentPath, "A2");
    assert.equal(byName("Rociadores").parentPath, "A3");

    // Numeración que reinicia en cada bloque: claves distintas, sin duplicados falsos
    assert.equal(byName("Pilotes").path, "A2/ESTRUCTURA-DE-HORMIGON-ARMADO/2/2.1");
    assert.equal(byName("Replanteo nivel 1").path, "A2/PLANTA-DE-CONJUNTO-PLANTA-NIVEL-1/1/1.1");

    // Etiqueta B.N. bajo su capítulo, subtítulos bajo la etiqueta; B.N. repetido no se duplica
    const aberturas = byName("ABERTURAS");
    const bn = build.nodes.filter((n) => n.name === "BLOQUES NUEVOS" && n.parentPath === aberturas.path);
    assert.equal(bn.length, 1);
    assert.equal(byName("PUERTAS").parentPath, bn[0].path);
    assert.equal(byName("VENTANAS").parentPath, bn[0].path);
    assert.equal(byName("Ventana aluminio").parentPath, byName("VENTANAS").path);
  });

  it("advierte ítems con PU 0 y códigos realmente repetidos, sin bloquear", () => {
    const { build } = generatePreview(workbook([{ name: "Hoja1", rows }]));
    const warnings = build.issues.filter((i) => i.type === "WARNING");
    assert.ok(warnings.some((i) => i.category === "MISSING_FIELD" && i.itemDescription === "Limpieza y desbroce"));
    assert.equal(build.nodes.find((n) => n.name === "Limpieza y desbroce").amount, 0);
    const dups = warnings.filter((i) => i.category === "DUPLICATE_CODE");
    assert.equal(dups.length, 1);
    assert.equal(dups[0].code, "6.2");
  });

  it("toma el monto del contrato como informativo", () => {
    const { build } = generatePreview(workbook([{ name: "Hoja1", rows }]), { contractAmount: 99999 });
    assert.notEqual(build.reconciliation.contractDifference, 0);
    assert.equal(build.reconciliation.balanced, true);
  });
});

// Regresión con la planilla real (no se versiona): BUDGET_FIXTURE=ruta.xlsx node --test
const fixture = process.env.BUDGET_FIXTURE;
if (fixture && fs.existsSync(fixture)) {
  describe("planilla real (BUDGET_FIXTURE)", () => {
    it("importa pruebacerterp.xlsx con cuadre OK y sin errores críticos", () => {
      const { build } = generatePreview(extractFromBuffer(fs.readFileSync(fixture), "pruebacerterp.xlsx"));
      assert.equal(build.reconciliation.itemsTotal, 29460942194);
      assert.equal(build.reconciliation.balanced, true);
      assert.equal(build.issues.filter((i) => i.type === "CRITICAL").length, 0);
      assert.equal(build.issues.filter((i) => i.category === "RECONCILIATION").length, 0);
      assert.equal(build.nodes.filter((n) => n.level === 0).length, 24);
    });
  });
}

describe("formato de la planilla", () => {
  it("combina un encabezado en dos filas con celdas combinadas", () => {
    const preview = generatePreview(
      workbook([
        {
          name: "Obra",
          rows: [
            ["Item", "Descripción", "Unidad", "Cantidad", "PRECIO", ""],
            ["", "", "", "", "Unitario", "Total"],
            ["1", "Rubro"],
            ["1.1", "Contrapiso", "m2", 40, 35000, 1400000],
          ],
          merges: [{ s: { r: 0, c: 4 }, e: { r: 0, c: 5 } }],
        },
      ])
    );
    const sheet = preview.sheets[0];
    const role = (idx) => sheet.columns.find((c) => c.index === idx)?.detectedRole;
    assert.equal(sheet.headerRowCount, 2);
    assert.equal(role(4), "unitPrice");
    assert.equal(role(5), "totalPrice");
    assert.equal(items(preview)[0].amount, 1400000);
  });

  it("propaga descripciones combinadas en vertical y excluye filas ocultas", () => {
    const spec = {
      name: "Obra",
      rows: [
        HEADER,
        ["1", "INSTALACIONES"],
        ["1.1", "Cañería 1/2", "m", 10, 8000, 80000],
        ["1.2", "Ítem viejo descartado", "m", 5, 1000, 5000],
        ["1.3", "Cañería 3/4", "m", 10, 9000, 90000],
      ],
      hiddenRows: [3],
    };
    const hidden = generatePreview(workbook([spec]));
    assert.equal(items(hidden).map((n) => n.name).includes("Ítem viejo descartado"), false);
    assert.equal(hidden.build.reconciliation.itemsTotal, 170000);

    const withHidden = generatePreview(workbook([spec]), { includeHidden: true });
    assert.equal(withHidden.build.reconciliation.itemsTotal, 175000);
  });
});

describe("recargos", () => {
  const rows = [
    HEADER,
    ["1", "RUBRO ÚNICO"],
    ["1.1", "Trabajo A", "gl", 1, 600000, 600000],
    ["1.2", "Trabajo B", "gl", 1, 400000, 400000],
    ["", "Gastos generales y beneficio 15%", "", "", "", ""],
    ["", "IVA 10%", "", "", "", ""],
    ["", "TOTAL GENERAL", "", "", "", 1265000],
  ];

  it("calcula los recargos acumulados y cuadra contra el total de la planilla", () => {
    const { build } = generatePreview(workbook([{ name: "Obra", rows }]));
    const rec = build.reconciliation;
    assert.equal(rec.itemsTotal, 1000000);
    assert.deepEqual(rec.surcharges.map((s) => s.amount), [150000, 115000]);
    assert.equal(rec.sheetComputedTotal, 1265000);
    assert.equal(rec.balanced, true);
    // GG se prorratea en los ítems e IVA se ignora por defecto
    assert.equal(rec.budgetTotal, 1150000);
    assert.equal(build.nodes.find((n) => n.name === "Trabajo A").amount, 690000);
  });

  it("permite cargar un recargo como partida propia", () => {
    const preview = generatePreview(workbook([{ name: "Obra", rows }]));
    const iva = preview.build.reconciliation.surcharges.find((s) => s.description.startsWith("IVA"));
    const rebuilt = buildBudgetTree(preview.rows, {
      surchargeTreatments: { ...preview.surchargeTreatments, [iva.rowId]: "AS_ITEM" },
    });
    assert.equal(rebuilt.reconciliation.budgetTotal, 1265000);
    assert.ok(rebuilt.nodes.some((n) => n.fromSurcharge && n.amount === 115000));
  });
});

describe("varias hojas y corrección manual", () => {
  const block = (name) => ({
    name,
    rows: [HEADER, ["1", "FUNDACIONES"], ["1.1", "Excavación", "m3", 10, 50000, 500000]],
  });

  it("no selecciona la hoja de resumen y separa cada hoja en su propio rubro", () => {
    const wb = workbook([
      { name: "Resumen", rows: [["Resumen"], ["Total", 1000000]] },
      block("Bloque A"),
      block("Bloque B"),
    ]);
    const single = generatePreview(wb);
    assert.equal(single.selectedSheets.includes("Resumen"), false);

    const multi = generatePreview(wb, { selectedSheets: ["Bloque A", "Bloque B"] });
    const excavaciones = items(multi).filter((n) => n.name === "Excavación");
    assert.equal(excavaciones.length, 2);
    assert.equal(new Set(excavaciones.map((n) => n.path)).size, 2);
    assert.equal(multi.build.reconciliation.itemsTotal, 1000000);
    assert.equal(multi.build.issues.filter((i) => i.type === "CRITICAL").length, 0);
  });

  it("recalcula el árbol cuando el usuario reclasifica una fila", () => {
    const preview = generatePreview(workbook([block("Obra")]));
    const rows = preview.rows.map((r) =>
      r.description === "Excavación" ? { ...r, kind: "IGNORAR" } : r
    );
    const rebuilt = buildBudgetTree(rows);
    assert.equal(rebuilt.counts.items, 0);
    assert.ok(rebuilt.issues.some((i) => i.type === "CRITICAL"));
  });
});
