import * as XLSX from "xlsx";

/**
 * Read an XLSX/XLS ArrayBuffer and extract the "List of Trades" sheet
 * (or first sheet) as CSV text for downstream parsing.
 */
export function xlsxToCSV(buffer: ArrayBuffer): string {
  const workbook = XLSX.read(buffer, { type: "array" });

  // Find the best sheet: prefer "List of Trades" or "Trades" (case-insensitive)
  const sheetName =
    workbook.SheetNames.find((n) =>
      n.toLowerCase().replace(/\s+/g, "") === "listoftrades"
    ) ??
    workbook.SheetNames.find((n) =>
      n.toLowerCase().replace(/\s+/g, "") === "trades"
    ) ??
    workbook.SheetNames[0];

  if (!sheetName) throw new Error("No sheets found in workbook");

  const sheet = workbook.Sheets[sheetName];
  return XLSX.utils.sheet_to_csv(sheet);
}

export function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
