
## Fix TradingView Parser for New Export Format

Your TradingView CSV uses column names and row ordering that don't match anything the parser expects. Every field extraction fails, producing "unparseable date" for all 1394+ trades.

### Root Causes

1. **Reversed row order**: Your file lists the Exit row before the Entry row for each trade. The parser blindly assumes `rows[0]` is entry and `rows[1]` is exit.

2. **Six unmatched column names**: The parser's candidate lists don't include TradingView's full column names like "Date and time", "Price USD", "Net P&L USD", etc.

### Changes

**`src/lib/parsers/tradingview.ts`** (main fix)

- **Smart entry/exit detection**: Instead of assuming row order, inspect the "Type" column value for each row. If it contains "entry", it's the entry row; if "exit", it's the exit row. This handles both orderings.

- **Add missing column candidates** to all `findCol`/`col` calls:
  - Date: add `"Date and time"`
  - Price: add `"Price USD"`
  - Quantity: add `"Position size (qty)"`, `"Position size"`
  - PnL: add `"Net P&L USD"`, `"Net P&L"`
  - MAE: add `"Adverse excursion USD"`, `"Adverse excursion"`
  - MFE: add `"Favorable excursion USD"`, `"Favorable excursion"`

**`src/lib/parsers/tradingview.test.ts`** (regression test)

- Add a test case using the new TradingView format (exit-first row order, new column names) to prevent future regressions.

### Technical Detail

The `findCol` function normalizes both the candidate string and the CSV header to lowercase alphanumeric-only, then compares for exact match. For example:
- Candidate `"Date and time"` normalizes to `"dateandtime"` and matches CSV header `"Date and time"` (also `"dateandtime"`).
- Candidate `"Net P&L USD"` normalizes to `"netplusd"` and matches CSV header `"Net P&L USD"`.

So we just need to add the exact TradingView header strings as candidates -- the normalization handles punctuation differences automatically.

### Expected Result

After this fix, your 1394-trade HTF file will parse correctly with accurate entry/exit times, prices, PnL values, and MAE/MFE data.
