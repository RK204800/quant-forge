/**
 * Safely parse a value to a finite number, returning fallback if unparseable.
 */
export function safeFloat(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ""));
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

  // Try native Date parse first (handles ISO 8601, "YYYY-MM-DD HH:mm", etc.)
  const native = new Date(trimmed);
  if (!isNaN(native.getTime())) return native.toISOString();

  // MM/DD/YYYY or MM-DD-YYYY with optional time
  const usMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (usMatch) {
    const [, m, d, y, h = "0", min = "0", s = "0"] = usMatch;
    const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
    if (!isNaN(date.getTime())) return date.toISOString();
  }

  // DD/MM/YYYY with optional time
  const euMatch = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/);
  if (euMatch) {
    const [, d, m, y, h = "0", min = "0", s = "0"] = euMatch;
    if (Number(m) <= 12) {
      const date = new Date(Number(y), Number(m) - 1, Number(d), Number(h), Number(min), Number(s));
      if (!isNaN(date.getTime())) return date.toISOString();
    }
  }

  return null;
}

/**
 * Case-insensitive column lookup: find the first matching key from a row object.
 */
export function findCol(row: Record<string, unknown>, ...candidates: string[]): unknown {
  for (const c of candidates) {
    const lower = c.toLowerCase();
    for (const key of Object.keys(row)) {
      if (key.toLowerCase() === lower || key.toLowerCase().replace(/[_\s]/g, "") === lower.replace(/[_\s]/g, "")) {
        return row[key];
      }
    }
  }
  return undefined;
}
