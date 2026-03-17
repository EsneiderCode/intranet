import * as XLSX from "xlsx";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { APP_NAME } from "@/lib/constants";

// ─── Excel ────────────────────────────────────────────────────────────────────

export function exportToExcel(
  rows: Record<string, string | number | null | undefined>[],
  filename: string,
  sheetName = "Datos"
) {
  const ws = XLSX.utils.json_to_sheet(rows);

  // Auto-width columns
  const colWidths = Object.keys(rows[0] ?? {}).map((key) => ({
    wch: Math.max(
      key.length,
      ...rows.map((r) => String(r[key] ?? "").length)
    ) + 2,
  }));
  ws["!cols"] = colWidths;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, sheetName);
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// ─── PDF ──────────────────────────────────────────────────────────────────────

export function exportToPDF(
  title: string,
  columns: string[],
  rows: (string | number | null | undefined)[][],
  filename: string
) {
  const doc = new jsPDF({ orientation: "landscape" });

  // Header
  doc.setFontSize(18);
  doc.setTextColor(30, 58, 95);
  doc.text(APP_NAME, 14, 16);

  doc.setFontSize(13);
  doc.setTextColor(40, 40, 40);
  doc.text(title, 14, 25);

  doc.setFontSize(9);
  doc.setTextColor(120, 120, 120);
  doc.text(
    `Generado: ${new Date().toLocaleDateString("es-DE", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })}`,
    14,
    32
  );

  autoTable(doc, {
    head: [columns],
    body: rows.map((r) => r.map((v) => v ?? "—")),
    startY: 38,
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: {
      fillColor: [30, 58, 95],
      textColor: 255,
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [245, 247, 250] },
    margin: { left: 14, right: 14 },
  });

  doc.save(`${filename}.pdf`);
}
