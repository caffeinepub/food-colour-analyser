import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import type { AnalysisRecord } from "./storage";

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function fmt(val: number): string {
  return val.toFixed(2);
}

type ExportRow = [string, string, string, string, string, string, string];

function buildRows(records: AnalysisRecord[]): ExportRow[] {
  return records.map((r) => [
    r.sampleName || "Unnamed Sample",
    formatDate(r.timestamp),
    fmt(r.L),
    fmt(r.a),
    fmt(r.b),
    fmt(r.chroma),
    fmt(r.whitenessIndex),
  ]);
}

const HEADERS: ExportRow = [
  "Sample Name",
  "Date / Time",
  "L*",
  "a*",
  "b*",
  "Chroma (C*)",
  "Whiteness Index (WI)",
];

// ─── Excel Export ────────────────────────────────────────

export function exportToExcel(
  records: AnalysisRecord[],
  filename = "food-colour-analysis",
): void {
  const wsData: (string | number)[][] = [HEADERS, ...buildRows(records)];

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Column widths
  ws["!cols"] = [
    { wch: 24 },
    { wch: 22 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Colour Analysis");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF Export ──────────────────────────────────────────

export function exportToPDF(
  records: AnalysisRecord[],
  filename = "food-colour-analysis",
  images?: {
    originalUrl: string;
    lUrl: string;
    aUrl: string;
    bUrl: string;
  },
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

  // ── Page 1: Data table ──────────────────────────────────

  // Header
  doc.setFillColor(22, 30, 46);
  doc.rect(0, 0, 297, 30, "F");

  doc.setTextColor(92, 219, 183);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Food Colour Analyser", 14, 12);

  doc.setTextColor(180, 200, 210);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text("CIE L*a*b* Colour Analysis Report", 14, 20);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 14, 26);
  doc.text(`Records: ${records.length}`, 200, 20);

  // Table
  autoTable(doc, {
    startY: 35,
    head: [HEADERS],
    body: buildRows(records),
    theme: "grid",
    headStyles: {
      fillColor: [24, 130, 105],
      textColor: [240, 255, 250],
      fontStyle: "bold",
      fontSize: 9,
      cellPadding: 3,
    },
    bodyStyles: {
      fontSize: 8.5,
      textColor: [30, 40, 55],
      cellPadding: 2.5,
    },
    alternateRowStyles: {
      fillColor: [240, 248, 245],
    },
    columnStyles: {
      0: { cellWidth: 50 },
      1: { cellWidth: 42 },
      2: { cellWidth: 18, halign: "right" },
      3: { cellWidth: 18, halign: "right" },
      4: { cellWidth: 18, halign: "right" },
      5: { cellWidth: 28, halign: "right" },
      6: { cellWidth: 36, halign: "right" },
    },
    margin: { left: 14, right: 14 },
    styles: {
      lineColor: [200, 220, 215],
      lineWidth: 0.1,
    },
  });

  // ── Page 2: Channel visualisations (optional) ───────────

  if (images) {
    doc.addPage();

    // Dark header strip
    doc.setFillColor(22, 30, 46);
    doc.rect(0, 0, 297, 30, "F");

    doc.setTextColor(92, 219, 183);
    doc.setFontSize(16);
    doc.setFont("helvetica", "bold");
    doc.text("Colour Channel Visualisations", 14, 12);

    doc.setTextColor(180, 200, 210);
    doc.setFontSize(9);
    doc.setFont("helvetica", "normal");
    doc.text("Original image alongside L*, a*, b* false-colour maps", 14, 22);

    // Grid layout constants
    // Page: 297 × 210 mm (landscape A4)
    // Grid area: x=14, y=38, total width=269 mm, total height=155 mm
    // 2×2 grid with 4 mm gap → each cell 132.5 × 75.5 mm
    const GRID_X = 14;
    const GRID_Y = 38;
    const TOTAL_W = 269;
    const TOTAL_H = 155;
    const GAP = 4;
    const CELL_W = (TOTAL_W - GAP) / 2; // 132.5
    const CELL_H = (TOTAL_H - GAP) / 2; // 75.5
    const LABEL_H = 6; // space above each image for the label text

    const cells: Array<{
      col: number;
      row: number;
      label: string;
      dataUrl: string;
    }> = [
      { col: 0, row: 0, label: "Original Image", dataUrl: images.originalUrl },
      {
        col: 1,
        row: 0,
        label: "L* Channel (Lightness)",
        dataUrl: images.lUrl,
      },
      { col: 0, row: 1, label: "a* Channel (Green–Red)", dataUrl: images.aUrl },
      {
        col: 1,
        row: 1,
        label: "b* Channel (Blue–Yellow)",
        dataUrl: images.bUrl,
      },
    ];

    for (const cell of cells) {
      const cellX = GRID_X + cell.col * (CELL_W + GAP);
      const cellY = GRID_Y + cell.row * (CELL_H + GAP);

      // Label above image
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(92, 219, 183);
      doc.text(cell.label, cellX, cellY + 4);

      // Image area (below label)
      const imgX = cellX;
      const imgY = cellY + LABEL_H;
      const imgW = CELL_W;
      const imgH = CELL_H - LABEL_H;

      try {
        // Add image with preserved aspect ratio by fitting inside the cell
        doc.addImage(cell.dataUrl, "PNG", imgX, imgY, imgW, imgH);
      } catch (err) {
        // If image rendering fails, draw a placeholder rectangle
        console.warn(`Failed to embed ${cell.label} in PDF:`, err);
        doc.setDrawColor(100, 120, 130);
        doc.setFillColor(30, 40, 55);
        doc.rect(imgX, imgY, imgW, imgH, "FD");
        doc.setTextColor(150, 160, 170);
        doc.setFontSize(7);
        doc.text("Image unavailable", imgX + imgW / 2, imgY + imgH / 2, {
          align: "center",
        });
      }
    }
  }

  // ── Footer on all pages ─────────────────────────────────
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 170);
    doc.text(`Page ${i} of ${pageCount} — Food Colour Analyser`, 148.5, 205, {
      align: "center",
    });
  }

  doc.save(`${filename}.pdf`);
}

// ─── Comparison Export Types ──────────────────────────────

export interface ComparisonExportData {
  sampleA: string;
  sampleB: string;
  timestamp: number;
  // CIELab
  A_L: number;
  A_a: number;
  A_b: number;
  A_chroma: number;
  A_wi: number;
  B_L: number;
  B_a: number;
  B_b: number;
  B_chroma: number;
  B_wi: number;
  deltaL: number;
  deltaA: number;
  deltaB: number;
  deltaChroma: number;
  deltaWI: number;
  deltaE: number;
  deltaELabel: string;
  // RGB
  A_r: number;
  A_g: number;
  A_b_ch: number;
  A_hex: string;
  B_r: number;
  B_g: number;
  B_b_ch: number;
  B_hex: string;
  deltaR: number;
  deltaG: number;
  deltaB_ch: number;
  // HSL
  A_hsl_h: number;
  A_hsl_s: number;
  A_hsl_l: number;
  B_hsl_h: number;
  B_hsl_s: number;
  B_hsl_l: number;
  // HSV
  A_hsv_h: number;
  A_hsv_s: number;
  A_hsv_v: number;
  B_hsv_h: number;
  B_hsv_s: number;
  B_hsv_v: number;
}

// ─── Comparison Excel Export ──────────────────────────────

export function exportComparisonToExcel(
  data: ComparisonExportData,
  filename = "food-colour-comparison",
): void {
  const f = (v: number) => Number.parseFloat(v.toFixed(2));
  const fd = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

  const rows: (string | number)[][] = [
    ["Food Colour Analyser — Comparison Report"],
    ["Generated", new Date(data.timestamp).toLocaleString()],
    ["Sample A", data.sampleA],
    ["Sample B", data.sampleB],
    [],
    // ΔE overall
    ["OVERALL COLOUR DIFFERENCE"],
    ["Metric", "Value", "", ""],
    ["ΔE*ab (CIE 1976)", f(data.deltaE), data.deltaELabel, ""],
    [],
    // CIELAB section
    ["CIELAB COORDINATES"],
    ["Metric", "Sample A", "Sample B", "Δ (B − A)"],
    ["L* (Lightness)", f(data.A_L), f(data.B_L), fd(data.deltaL)],
    ["a* (Green–Red)", f(data.A_a), f(data.B_a), fd(data.deltaA)],
    ["b* (Blue–Yellow)", f(data.A_b), f(data.B_b), fd(data.deltaB)],
    ["Chroma C*", f(data.A_chroma), f(data.B_chroma), fd(data.deltaChroma)],
    ["Whiteness Index (WI)", f(data.A_wi), f(data.B_wi), fd(data.deltaWI)],
    [],
    // RGB section
    ["RGB / HEX"],
    ["Metric", "Sample A", "Sample B", "Δ (B − A)"],
    ["R (Red)", f(data.A_r), f(data.B_r), fd(data.deltaR)],
    ["G (Green)", f(data.A_g), f(data.B_g), fd(data.deltaG)],
    ["B (Blue)", f(data.A_b_ch), f(data.B_b_ch), fd(data.deltaB_ch)],
    ["HEX", data.A_hex.toUpperCase(), data.B_hex.toUpperCase(), ""],
    [],
    // HSL section
    ["HSL (Perceptual)"],
    ["Metric", "Sample A", "Sample B", "Δ (B − A)"],
    [
      "Hue (°)",
      f(data.A_hsl_h),
      f(data.B_hsl_h),
      fd(data.B_hsl_h - data.A_hsl_h),
    ],
    [
      "Saturation (%)",
      f(data.A_hsl_s),
      f(data.B_hsl_s),
      fd(data.B_hsl_s - data.A_hsl_s),
    ],
    [
      "Lightness (%)",
      f(data.A_hsl_l),
      f(data.B_hsl_l),
      fd(data.B_hsl_l - data.A_hsl_l),
    ],
    [],
    // HSV section
    ["HSV (Perceptual)"],
    ["Metric", "Sample A", "Sample B", "Δ (B − A)"],
    [
      "Hue (°)",
      f(data.A_hsv_h),
      f(data.B_hsv_h),
      fd(data.B_hsv_h - data.A_hsv_h),
    ],
    [
      "Saturation (%)",
      f(data.A_hsv_s),
      f(data.B_hsv_s),
      fd(data.B_hsv_s - data.A_hsv_s),
    ],
    [
      "Value (%)",
      f(data.A_hsv_v),
      f(data.B_hsv_v),
      fd(data.B_hsv_v - data.A_hsv_v),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(rows);

  ws["!cols"] = [{ wch: 26 }, { wch: 18 }, { wch: 18 }, { wch: 16 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Colour Comparison");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── Comparison PDF Export ────────────────────────────────

export function exportComparisonToPDF(
  data: ComparisonExportData,
  filename = "food-colour-comparison",
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });
  const f = (v: number) => v.toFixed(2);
  const fd = (v: number) => (v >= 0 ? `+${v.toFixed(2)}` : v.toFixed(2));

  // Header
  doc.setFillColor(22, 30, 46);
  doc.rect(0, 0, 297, 34, "F");

  doc.setTextColor(92, 219, 183);
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text("Food Colour Analyser — Comparison Report", 14, 12);

  doc.setTextColor(180, 200, 210);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Sample A: ${data.sampleA}`, 14, 20);
  doc.text(`Sample B: ${data.sampleB}`, 14, 26);
  doc.text(`Generated: ${new Date(data.timestamp).toLocaleString()}`, 14, 32);
  doc.text(`ΔE*ab: ${f(data.deltaE)} — ${data.deltaELabel}`, 180, 20);

  const HEAD_STYLES = {
    fillColor: [24, 130, 105] as [number, number, number],
    textColor: [240, 255, 250] as [number, number, number],
    fontStyle: "bold" as const,
    fontSize: 8.5,
    cellPadding: 2.5,
  };

  const BODY_STYLES = {
    fontSize: 8,
    textColor: [30, 40, 55] as [number, number, number],
    cellPadding: 2,
  };

  const ALT_ROW = { fillColor: [240, 248, 245] as [number, number, number] };

  const COL_STYLES = {
    0: { cellWidth: 50 },
    1: { cellWidth: 40, halign: "right" as const },
    2: { cellWidth: 40, halign: "right" as const },
    3: { cellWidth: 30, halign: "right" as const },
  };

  const MARGIN = { left: 14, right: 14 };
  const STYLES = {
    lineColor: [200, 220, 215] as [number, number, number],
    lineWidth: 0.1,
  };

  let curY = 40;

  // Section: CIELAB
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(92, 219, 183);
  doc.text("CIELAB COORDINATES", 14, curY);
  curY += 2;

  autoTable(doc, {
    startY: curY,
    head: [["Metric", `A: ${data.sampleA}`, `B: ${data.sampleB}`, "Δ (B − A)"]],
    body: [
      ["L* (Lightness)", f(data.A_L), f(data.B_L), fd(data.deltaL)],
      ["a* (Green–Red)", f(data.A_a), f(data.B_a), fd(data.deltaA)],
      ["b* (Blue–Yellow)", f(data.A_b), f(data.B_b), fd(data.deltaB)],
      ["Chroma C*", f(data.A_chroma), f(data.B_chroma), fd(data.deltaChroma)],
      ["Whiteness Index (WI)", f(data.A_wi), f(data.B_wi), fd(data.deltaWI)],
      ["ΔE*ab", f(data.deltaE), "", data.deltaELabel],
    ],
    theme: "grid",
    headStyles: HEAD_STYLES,
    bodyStyles: BODY_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: COL_STYLES,
    margin: MARGIN,
    styles: STYLES,
  });

  curY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  // Section: RGB / HEX
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(92, 219, 183);
  doc.text("RGB / HEX", 14, curY);
  curY += 2;

  autoTable(doc, {
    startY: curY,
    head: [["Metric", `A: ${data.sampleA}`, `B: ${data.sampleB}`, "Δ (B − A)"]],
    body: [
      ["R (Red)", f(data.A_r), f(data.B_r), fd(data.deltaR)],
      ["G (Green)", f(data.A_g), f(data.B_g), fd(data.deltaG)],
      ["B (Blue)", f(data.A_b_ch), f(data.B_b_ch), fd(data.deltaB_ch)],
      ["HEX", data.A_hex.toUpperCase(), data.B_hex.toUpperCase(), ""],
    ],
    theme: "grid",
    headStyles: HEAD_STYLES,
    bodyStyles: BODY_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: COL_STYLES,
    margin: MARGIN,
    styles: STYLES,
  });

  curY =
    (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable
      .finalY + 8;

  // Section: HSL & HSV (side by side in one table)
  doc.setFontSize(9);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(92, 219, 183);
  doc.text("HSL / HSV PERCEPTUAL PROPERTIES", 14, curY);
  curY += 2;

  autoTable(doc, {
    startY: curY,
    head: [["Metric", `A: ${data.sampleA}`, `B: ${data.sampleB}`, "Δ (B − A)"]],
    body: [
      [
        "HSL Hue (°)",
        f(data.A_hsl_h),
        f(data.B_hsl_h),
        fd(data.B_hsl_h - data.A_hsl_h),
      ],
      [
        "HSL Saturation (%)",
        f(data.A_hsl_s),
        f(data.B_hsl_s),
        fd(data.B_hsl_s - data.A_hsl_s),
      ],
      [
        "HSL Lightness (%)",
        f(data.A_hsl_l),
        f(data.B_hsl_l),
        fd(data.B_hsl_l - data.A_hsl_l),
      ],
      [
        "HSV Hue (°)",
        f(data.A_hsv_h),
        f(data.B_hsv_h),
        fd(data.B_hsv_h - data.A_hsv_h),
      ],
      [
        "HSV Saturation (%)",
        f(data.A_hsv_s),
        f(data.B_hsv_s),
        fd(data.B_hsv_s - data.A_hsv_s),
      ],
      [
        "HSV Value (%)",
        f(data.A_hsv_v),
        f(data.B_hsv_v),
        fd(data.B_hsv_v - data.A_hsv_v),
      ],
    ],
    theme: "grid",
    headStyles: HEAD_STYLES,
    bodyStyles: BODY_STYLES,
    alternateRowStyles: ALT_ROW,
    columnStyles: COL_STYLES,
    margin: MARGIN,
    styles: STYLES,
  });

  // Footer
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(150, 160, 170);
    doc.text(
      `Page ${i} of ${pageCount} — Food Colour Analyser Comparison`,
      148.5,
      205,
      { align: "center" },
    );
  }

  doc.save(`${filename}.pdf`);
}
