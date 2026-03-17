import { estToUTCISO } from "@/lib/timezone";

/**
 * Safely parse a value to a finite number, returning fallback if unparseable.
 */
export function safeFloat(val: unknown, fallback = 0): number {
  let s = String(val ?? "").trim();
  // Strip currency symbols and commas
  s = s.replace(/[$€£¥,]/g, "");
  // Handle accounting negatives: (123.45) → -123.45
  const acctMatch = s.match(/^\((.+)\)$/);
  if (acctMatch) s = "-" + acctMatch[1];
  const n = parseFloat(s);
  return isFinite(n) ? n : fallback;
}

/**
 * Normalize date/time strings from various formats to ISO 8601.
 * Returns null if the date is genuinely unparseable (caller decides fallback).
 */
export function normalizeDateTime(dt: string): string | null {
  if (!dt || !dt.trim()) return null;

  const trimmed = dt.trim();

  // Unix timestamp (seconds or milliseconds)
  if (/^\d{10,13}$/.test(trimmed)) {
    const ms = trimmed.length <= 10 ? Number(trimmed) * 1000 : Number(trimmed);
    const d = new Date(ms);
    if (!isNaN(d.getTime())) return d.toISOString();
  }

  // DD-Mon-YY(YY) with optional time (e.g. "02-Jan-26 10:54:00 AM")
  const monthNames: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  const monMatch = trimmed.match(
    /^(\d{1,2})[\/\-]([A-Za-z]{3})[\/\-](\d{2,4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i
  );
  if (monMatch) {
    const [, dayStr, monStr, yearStr, hStr = "0", minStr = "0", sStr = "0", ampm] = monMatch;
    const mon = monthNames[monStr.toLowerCase()];
    if (mon !== undefined) {
      let year = Number(yearStr);
      if (year < 100) year += year < 70 ? 2000 : 1900;
      let hour = Number(hStr);
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
        if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
      }
      // Treat ambiguous dates as EST
      return estToUTCISO(year, mon, Number(dayStr), hour, Number(minStr), Number(sStr));
    }
  }

  // Try native Date parse first (handles ISO 8601, "YYYY-MM-DD HH:mm", etc.)
  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native.toISOString();

  // MM/DD/YYYY or MM-DD-YYYY with optional time and AM/PM
  const usMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (usMatch) {
    const [, m, d, y, h = "0", min = "0", s = "0", ampm] = usMatch;
    let hour = Number(h);
    if (ampm) {
      if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
      if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
    }
    const date = new Date(Number(y), Number(m) - 1, Number(d), hour, Number(min), Number(s));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // DD/MM/YYYY with optional time and AM/PM
  const euMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i);
  if (euMatch) {
    const [, d, m, y, h = "0", min = "0", s = "0", ampm] = euMatch;
    if (Number(m) <= 12) {
      let hour = Number(h);
      if (ampm) {
        if (ampm.toUpperCase() === "PM" && hour < 12) hour += 12;
        if (ampm.toUpperCase() === "AM" && hour === 12) hour = 0;
      }
      const date = new Date(Number(y), Number(m) - 1, Number(d), hour, Number(min), Number(s));
      if (!isNaN(date.getTime())) return date.toISOString();
    }
  }

  return null;
}

/**
 * Case-insensitive column lookup: find the first matching key from a row object.
 */
/**
 * Compute PnL from entry/exit prices when no explicit PnL column exists.
 */
export function computePnl(direction: "long" | "short", entryPrice: number, exitPrice: number, quantity: number): number {
  if (entryPrice === 0 || exitPrice === 0) return 0;
  return direction === "short"
    ? (entryPrice - exitPrice) * quantity
    : (exitPrice - entryPrice) * quantity;
}

/** Normalize a header token: lowercase, strip all non-alphanumeric chars */
export function normalizeHeader(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]/g, "");
}

export function findCol(row: Record<string, unknown>, ...candidates: string[]): unknown {
  for (const c of candidates) {
    const lc = normalizeHeader(c);
    for (const key of Object.keys(row)) {
      if (normalizeHeader(key) === lc) {
        return row[key];
      }
    }
  }
  return undefined;
}

/**
 * Known trade-table column tokens used for header-row detection scoring.
 */
const TRADE_COLUMN_TOKENS = new Set([
  "tradenumber", "trade", "tradeno", "instrument", "symbol", "ticker",
  "entryprice", "exitprice", "entrydate", "exitdate", "entrytime", "exittime",
  "profit", "pnl", "netprofit", "netpnl", "pl", "commission",
  "quantity", "qty", "contracts", "size", "direction", "side", "type",
  "marketposition", "marketpos", "price", "datetime", "date", "signal",
  "mae", "mfe", "runup", "drawdown", "cumprofit",
  "entryname", "exitname", "ofcontracts",
]);

/**
 * Detect the most likely delimiter in a CSV line.
 */
export function detectDelimiter(line: string): string {
  const candidates = [",", ";", "\t"];
  let best = ",";
  let bestCount = 0;
  for (const d of candidates) {
    const count = line.split(d).length - 1;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }
  return best;
}

/**
 * Score a CSV header line: how many columns match known trade-table tokens.
 */
export function scoreHeaderRow(headerLine: string): number {
  const delimiter = detectDelimiter(headerLine);
  const cols = headerLine.split(delimiter).map((c) => normalizeHeader(c.replace(/^"|"$/g, "")));
  return cols.filter((c) => c.length > 0 && TRADE_COLUMN_TOKENS.has(c)).length;
}

/**
 * Strip BOM, `sep=` directives, and metadata rows above the real header.
 * Returns the content starting from the detected header row.
 */
export function stripPrelude(content: string): string {
  let clean = content.replace(/^\uFEFF/, "");
  // Remove sep= directive line
  clean = clean.replace(/^sep=.\r?\n/i, "");

  const lines = clean.split(/\r?\n/);
  let bestIdx = 0;
  let bestScore = 0;
  const scanLimit = Math.min(lines.length, 30);
  for (let i = 0; i < scanLimit; i++) {
    const score = scoreHeaderRow(lines[i]);
    if (score > bestScore) {
      bestScore = score;
      bestIdx = i;
    }
  }
  // Only skip rows if we found a header with at least 3 matching columns
  if (bestScore >= 3 && bestIdx > 0) {
    return lines.slice(bestIdx).join("\n");
  }
  return clean;
}
