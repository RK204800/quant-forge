import ExcelJS from "exceljs";

/**
 * Read an XLSX/XLS ArrayBuffer and extract the "List of Trades" sheet
 * (or first sheet) as CSV text for downstream parsing.
 */
export async function xlsxToCSV(buffer: ArrayBuffer): Promise<string> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer);

  // Find the best sheet: prefer "List of Trades" or "Trades" (case-insensitive)
  let targetSheet = workbook.worksheets.find((ws) =>
    ws.name.toLowerCase().replace(/\s+/g, "") === "listoftrades"
  );
  if (!targetSheet) {
    targetSheet = workbook.worksheets.find((ws) =>
      ws.name.toLowerCase().replace(/\s+/g, "") === "trades"
    );
  }
  if (!targetSheet) {
    targetSheet = workbook.worksheets[0];
  }

  if (!targetSheet) throw new Error("No sheets found in workbook");

  const rows: string[] = [];
  targetSheet.eachRow((row) => {
    const values = row.values as (string | number | boolean | null | undefined)[];
    // ExcelJS row.values is 1-indexed (index 0 is undefined), so slice from 1
    const cells = values.slice(1).map((cell) => {
      if (cell == null) return "";
      const str = String(cell);
      // Escape CSV: quote fields containing commas, quotes, or newlines
      if (str.includes(",") || str.includes('"') || str.includes("\n")) {
        return `"${str.replace(/"/g, '""')}"`;
      }
      return str;
    });
    rows.push(cells.join(","));
  });

  return rows.join("\n");
}

export function isExcelFile(fileName: string): boolean {
  const lower = fileName.toLowerCase();
  return lower.endsWith(".xlsx") || lower.endsWith(".xls");
}
