

# Flexible CSV Column Mapping System

## Problem
The parser only recognizes specific pre-mapped column names. When a CSV uses unfamiliar headers, it fails silently with "No trades found" and the user has no recourse. Different platforms export different column layouts, and we can't predict them all.

## Solution
Add a **manual column mapping UI** that activates automatically when auto-detection fails. The user sees their CSV's actual column headers and maps them to trade fields using dropdowns. Not all fields are required -- unmapped fields default to null/zero.

## User Flow

```text
Upload CSV
    |
    v
Auto-detect format
    |
    +---> Trades found --> Queue (existing flow)
    |
    +---> 0 trades found --> Show Column Mapper
                                |
                                v
                            Display CSV headers as rows
                            Each row has a dropdown: Entry Date, Exit Date,
                            Direction, Entry Price, Exit Price, PnL, Quantity,
                            Instrument, Commission, MAE, MFE, (skip)
                                |
                                v
                            User maps columns, clicks "Apply"
                                |
                                v
                            Parse with user mapping --> Queue
```

## Trade Fields and Defaults

| Field | Required? | Default if unmapped |
|-------|-----------|-------------------|
| Entry Date/Time | Yes (minimum) | -- |
| Exit Date/Time | No | Same as entry |
| Direction | No | "long" |
| Entry Price | No | 0 |
| Exit Price | No | 0 |
| PnL / Profit | No | Computed from prices, or 0 |
| Quantity | No | 1 |
| Instrument | No | "UNKNOWN" |
| Commission | No | 0 |
| MAE | No | null |
| MFE | No | null |
| Trade # (grouping) | No | Each row = 1 trade |

If Trade # is mapped, rows are grouped (like TradingView paired entry/exit rows). Otherwise each row is treated as one complete trade.

## Files to Create/Modify

### New: `src/components/upload/ColumnMapper.tsx`
- Receives: CSV headers (string[]), sample rows (first 3 rows for preview), raw content, fileName
- Shows a table: left column = CSV header name + sample values, right column = dropdown to select trade field
- "Apply Mapping" button, disabled until at least Entry Date is mapped
- Calls `parseWithMapping()` and returns `ParseResult`

### New: `src/lib/parsers/mapped.ts`
- `parseWithMapping(content, strategyId, mapping)` function
- Takes a `Record<string, TradeField>` mapping (CSV header -> trade field enum)
- Handles both flat (one row per trade) and grouped (Trade # mapped) modes
- Applies same `safeFloat`, `normalizeDateTime`, `computePnl` utilities
- Returns standard `ParseResult`

### Modify: `src/types/index.ts`
- Add `TradeField` type: `"entryTime" | "exitTime" | "direction" | "entryPrice" | "exitPrice" | "pnl" | "quantity" | "instrument" | "commission" | "mae" | "mfe" | "tradeNumber" | "skip"`
- Add `ColumnMapping` interface: `{ csvHeader: string; tradeField: TradeField }`

### Modify: `src/components/upload/UploadZone.tsx`
- When `parseFile` returns 0 trades, instead of immediately setting an error, store the failed file's raw content, headers, and sample rows in state
- Render `ColumnMapper` inline below the drop zone
- On successful manual mapping, pass the result back through `onParsed`

### Modify: `src/lib/parsers/index.ts`
- Export a `extractHeaders(content)` utility that returns `{ headers: string[], sampleRows: Record<string, string>[] }` for the mapper UI to display

## Design Details

- The mapper UI uses the existing Card/Select components for consistency
- Sample values shown as muted text under each header so users can see what data is in each column
- A "skip" option in each dropdown for columns the user doesn't need
- If only PnL or only prices are mapped, the system handles both cases (direct PnL vs computed)
- Columns not mapped to anything are silently ignored

