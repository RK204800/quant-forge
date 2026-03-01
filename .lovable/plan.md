

## Fix NinjaTrader CSV Parser Column Matching

### Problem
The NinjaTrader parser uses **exact property access** (`row.Profit`, `row["Entry price"]`) for column lookups, while the Backtrader parser uses the robust `findCol()` fuzzy matcher. If the uploaded CSV has any variation in column naming (e.g., trailing spaces, "Net profit" vs "Profit", BOM characters), the Profit column isn't found, and the parser falls back to `computePnl()` which simply computes `(exitPrice - entryPrice) * quantity` -- the raw point difference without futures contract multipliers.

For NQ futures (where 1 point = $20), this means a trade showing $530 profit gets stored as 26.5.

### Solution
Refactor the NinjaTrader parser to use `findCol()` for all column lookups, matching the robustness of the Backtrader parser. Also add more Profit column name candidates.

### Changes

**`src/lib/parsers/ninjatrader.ts`**
- Replace all exact `row["Column Name"]` and `row.Column` accesses with `findCol(row, ...)` calls
- Add comprehensive candidate names for each field:
  - Profit: `"Profit", "profit", "Net profit", "Net P&L", "P&L", "pnl", "PnL"`
  - Commission: `"Commission", "commission", "comm"`
  - Entry time: `"Entry time", "EntryTime", "entry_time", "Entry Date", "entry_date"`
  - Exit time: `"Exit time", "ExitTime", "exit_time", "Exit Date", "exit_date"`
  - Market position / Direction: `"Market position", "MarketPosition", "direction", "Direction", "side", "Side", "type", "Type"`
  - Entry price: `"Entry price", "EntryPrice", "entry_price", "Entry"`
  - Exit price: `"Exit price", "ExitPrice", "exit_price", "Exit"`
  - Quantity: `"Quantity", "quantity", "qty", "Qty", "size", "contracts", "Contracts"`
  - Instrument: `"Instrument", "instrument", "ticker", "symbol", "Symbol", "Ticker"`
  - MAE/MFE: `"MAE", "mae", "Max Adverse Excursion"` / `"MFE", "mfe", "Max Favorable Excursion"`

This ensures the parser handles any case/spacing/naming variations in NinjaTrader CSV exports.

### Technical Detail
The `findCol()` utility already does case-insensitive matching and strips underscores/spaces, so adding it here makes the NinjaTrader parser as resilient as the Backtrader one. No changes to `findCol` itself are needed.
