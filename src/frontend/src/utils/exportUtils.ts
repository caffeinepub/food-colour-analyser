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
): void {
  const doc = new jsPDF({ orientation: "landscape", unit: "mm", format: "a4" });

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

  // Footer
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
