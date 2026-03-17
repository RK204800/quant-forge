import { formatInTimeZone, fromZonedTime, toZonedTime } from "date-fns-tz";

export const APP_TIMEZONE = "America/New_York";

/**
 * Format a date/string in EST using a date-fns format pattern.
 */
export function formatEST(date: Date | string, fmt: string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  if (isNaN(d.getTime())) return "—";
  return formatInTimeZone(d, APP_TIMEZONE, fmt);
}

/**
 * Get the hour (0-23) in EST for a given date.
 */
export function getESTHour(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return zoned.getHours();
}

/**
 * Get the minutes in EST for a given date.
 */
export function getESTMinutes(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return zoned.getMinutes();
}

/**
 * Get day of week (0=Sun..6=Sat) in EST for a given date.
 */
export function getESTDayOfWeek(date: Date | string): number {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return zoned.getDay();
}

/**
 * Get a yyyy-MM-dd date key in EST timezone.
 */
export function getESTDateKey(date: Date | string): string {
  return formatEST(date, "yyyy-MM-dd");
}

/**
 * Get year and month in EST timezone.
 */
export function getESTYearMonth(date: Date | string): { year: number; month: number } {
  const d = typeof date === "string" ? new Date(date) : date;
  const zoned = toZonedTime(d, APP_TIMEZONE);
  return { year: zoned.getFullYear(), month: zoned.getMonth() };
}

/**
 * Treat a parsed local date (year, month, day, hour, min, sec) as EST
 * and convert to UTC ISO string.
 */
export function estToUTCISO(year: number, month: number, day: number, hour = 0, min = 0, sec = 0): string {
  const fakeLocal = new Date(year, month, day, hour, min, sec);
  const utc = fromZonedTime(fakeLocal, APP_TIMEZONE);
  return utc.toISOString();
}
