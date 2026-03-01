

# Fix Upload Rendering Issues

## Root Cause Analysis

After investigating the session replay, database, and parser code, I found several interconnected bugs causing uploads to render incorrectly:

### Problem 1: NaN Corruption in Equity Calculations
When a parser encounters an unparseable numeric field (e.g., empty string, unexpected format), `parseFloat("")` returns `NaN`. Once `runningEquity += NaN` executes, **all subsequent equity points become NaN**. The `safeNum` guard in EquityCurve catches this at render time (showing $0), but the underlying data is corrupted.

**Affected files**: All parsers (`backtrader.ts`, `tradingview.ts`, `ninjatrader.ts`, `quantconnect.ts`)

### Problem 2: Date Fallback to Today
When dates can't be parsed, `normalizeDateTime` (and similar logic in other parsers) falls back to `new Date().toISOString()` -- today's date. This causes all equity points to show as "Mar 01" (today) instead of actual trade dates, making the chart meaningless.

### Problem 3: Generic Parser Column Mismatch
When the format detector can't identify the file format, it falls back to the Backtrader parser. If the user's CSV has different column names (e.g., "Date" instead of "entry_date", "P/L" instead of "pnl"), all values parse as 0/NaN.

## Changes

### 1. Add `safeFloat` utility to all parsers
Create a shared helper that returns 0 instead of NaN for unparseable values, preventing equity corruption:
```text
function safeFloat(val: unknown, fallback = 0): number {
  const n = parseFloat(String(val ?? ""));
  return isFinite(n) ? n : fallback;
}
```

Apply to every `parseFloat` call in all four parsers.

### 2. Improve generic CSV column detection
Update the Backtrader/generic parser to handle more column name variations:
- Date columns: "date", "Date", "entry_date", "Entry Date", "open_time", "datetime"
- Price columns: "entry_price", "Entry", "Open", "open_price"
- PnL columns: "pnl", "P&L", "P/L", "profit", "Profit", "net_profit", "Net P&L"
- Quantity: "size", "qty", "quantity", "Quantity", "contracts", "volume"

### 3. Fix date parsing with multi-format support
Enhance `normalizeDateTime` (and add it to parsers that lack it) to handle common date formats:
- `YYYY-MM-DD HH:mm:ss` (standard)
- `MM/DD/YYYY HH:mm` (US format)
- `DD/MM/YYYY` (EU format)
- Unix timestamps
- Skip the `new Date()` fallback -- instead mark the trade with a warning

### 4. Add validation feedback in UploadZone
When parsed trades have issues (NaN values, fallback dates), show specific warnings to the user so they know what went wrong, instead of silently rendering $0 equity.

### 5. Guard EquityCurve and TradesTable against bad data
- Filter out equity points with NaN/zero equity before charting
- In TradesTable, show "N/A" for unparseable values instead of "NaN" or "0.00"

## Files to Modify

1. **New file**: `src/lib/parsers/utils.ts` -- shared `safeFloat` and `normalizeDateTime` helpers
2. **Edit**: `src/lib/parsers/backtrader.ts` -- use `safeFloat`, expand column name matching
3. **Edit**: `src/lib/parsers/tradingview.ts` -- use shared `safeFloat` and `normalizeDateTime`
4. **Edit**: `src/lib/parsers/ninjatrader.ts` -- use `safeFloat`
5. **Edit**: `src/lib/parsers/quantconnect.ts` -- use `safeFloat`
6. **Edit**: `src/components/dashboard/EquityCurve.tsx` -- filter invalid data points
7. **Edit**: `src/components/dashboard/TradesTable.tsx` -- guard against NaN display
8. **Edit**: `src/components/upload/UploadZone.tsx` -- show parse quality feedback

