import ExcelJS from "exceljs";
import { scoreHeaderRow, normalizeHeader } from "./utils";

/**
 * Read an XLSX/XLS ArrayBuffer and extract the best trade-data sheet
 * as CSV text for downstream parsing.
 */
export async function xlsxToCSV(buffer: ArrayBuffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Score each sheet by trade-column matches in its first 20 rows
  let bestSheet = workbook.worksheets[0];
  let bestScore = -1;

  for (const ws of workbook.worksheets) {
    // Fast path: prefer known sheet names
    const name = normalizeHeader(ws.name);
    if (name === "listoftrades" || name === "trades") {
      bestSheet = ws;
      bestScore = Infinity;
      break;
    }
    // Score first 20 rows
    let sheetScore = 0;
    ws.eachRow({ includeEmpty: false }, (row, rowNumber) => {
      if (rowNumber > 20) return;
      const values = row.values as (string | number | boolean | null | undefined)[];
      const line = values.slice(1).map((c) => String(c ?? "")).join(",");
      const s = scoreHeaderRow(line);
      if (s > sheetScore) sheetScore = s;
    });
    if (sheetScore > bestScore) {
      bestScore = sheetScore;
      bestSheet = ws;
    }
  }

  if (!bestSheet) throw new Error("No sheets found in workbook");

  // Find the best header row within the sheet
  const allRows: string[][] = [];
  bestSheet.eachRow((row) => {
    const values = row.values as (string | number | boolean | null | undefined)[];
    const cells = values.slice(1).map((cell) => {
      if (cell == null) return "";
      const str = String(cell);
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    allRows.push(cells);
  });

  // Find best header row index
  let headerIdx = 0;
  let headerScore = 0;
  const scanLimit = Math.min(allRows.length, 30);
  for (let i = 0; i < scanLimit; i++) {
    const s = scoreHeaderRow(allRows[i].join(","));
    if (s > headerScore) {
      headerScore = s;
      headerIdx = i;
    }
  }

  // Start from header row
  const csvRows = allRows.slice(headerIdx).map((cells) => cells.join(","));
  return csvRows.join("\n");
}

export function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
