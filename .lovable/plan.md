

## Standardize All Times to EST (America/New_York)

### Problem
Currently, dates are parsed using the browser's local timezone (`new Date(year, month, day, ...)`) and stored as UTC ISO strings. Display uses `date-fns format()` which renders in the browser's local timezone. This means a user in California sees Pacific time, a user in London sees GMT, etc. All times should consistently display in EST/ET.

### Approach

**1. Add `date-fns-tz` dependency** for timezone-aware formatting.

**2. Create a shared time utility** (`src/lib/timezone.ts`):
- Export a constant `APP_TIMEZONE = "America/New_York"`
- Export `formatEST(date: Date | string, fmt: string)` — wraps `formatInTimeZone` from `date-fns-tz`
- Export `toESTDate(date: Date | string)` — returns a Date interpreted in EST context
- Export helper `getESTHour(date: Date | string)` and `getESTDayOfWeek(date: Date | string)` for the analytics grouping functions

**3. Fix import/parsing** (`src/lib/parsers/utils.ts`):
- In `normalizeDateTime`, when constructing dates from components (DD-Mon-YY, MM/DD/YYYY, DD/MM/YYYY), treat the parsed time as EST rather than browser-local. Use `date-fns-tz`'s `zonedTimeToUtc` to convert from EST to UTC before calling `.toISOString()`.
- Add a warning if no timezone info is present in the raw data (informational only — default to EST).

**4. Update all display formatting** — replace `format(new Date(...), fmt)` with `formatEST(dateStr, fmt)` in these files:
- `src/components/dashboard/EquityCurve.tsx` — X-axis labels and tooltip
- `src/components/dashboard/TradesTable.tsx` — entry/exit time columns
- `src/components/dashboard/TradePnlChart.tsx` — date labels
- `src/components/dashboard/PerformanceSummary.tsx` — formatDate helper
- `src/components/dashboard/TradeChart.tsx` — date keys for candles/markers
- `src/pages/CompareStrategies.tsx` — date keys and labels
- `src/pages/Portfolio.tsx` — created-at date

**5. Update analytics grouping** (`src/lib/analytics.ts`):
- `groupByTimeOfDay` — use `getESTHour` instead of `d.getHours()` / `d.getMinutes()`
- `groupByDayOfWeek` — use `getESTDayOfWeek` instead of `d.getDay()`
- `groupByPeriod` — use EST date keys instead of local/UTC
- `getMonthlyReturns` — use EST year/month

**6. Update portfolio analytics** (`src/lib/portfolio-analytics.ts`):
- Use EST date keys for daily return grouping

### Files Modified
- **New**: `src/lib/timezone.ts`
- `src/lib/parsers/utils.ts` — treat ambiguous times as EST on import
- `src/lib/analytics.ts` — EST-aware grouping
- `src/lib/portfolio-analytics.ts` — EST date keys
- `src/components/dashboard/EquityCurve.tsx`
- `src/components/dashboard/TradesTable.tsx`
- `src/components/dashboard/TradePnlChart.tsx`
- `src/components/dashboard/PerformanceSummary.tsx`
- `src/components/dashboard/TradeChart.tsx`
- `src/pages/CompareStrategies.tsx`
- `src/pages/Portfolio.tsx`

### Dependencies
- Add `date-fns-tz` package

