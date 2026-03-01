

# Fix Incorrect PnL Calculations

## Root Cause

All four parsers (backtrader, tradingview, ninjatrader, quantconnect) only read PnL from an explicit column. If the CSV lacks a PnL column (or uses an unrecognized name), `safeFloat` returns 0 and every trade shows $0 P&L. The equity curve then becomes a flat line at $100,000.

**No parser calculates PnL from entry/exit prices as a fallback**, which is the standard way to derive it.

## Fix

### 1. Add PnL calculation helper to `src/lib/parsers/utils.ts`

Add a `computePnl` function:

```text
For long trades:  (exitPrice - entryPrice) * quantity
For short trades: (entryPrice - exitPrice) * quantity
```

### 2. Update all four parsers to use calculated PnL as fallback

In each parser, after reading entry price, exit price, quantity, and direction:

- If the parsed PnL value is 0 AND both entry and exit prices are non-zero, calculate PnL from prices using the formula above
- This ensures CSVs with explicit PnL columns still use those values, while CSVs without them get correct derived values

### Files to modify

1. `src/lib/parsers/utils.ts` -- add `computePnl(direction, entryPrice, exitPrice, quantity)` helper
2. `src/lib/parsers/backtrader.ts` -- use `computePnl` when `pnl === 0` and prices exist
3. `src/lib/parsers/tradingview.ts` -- same fallback
4. `src/lib/parsers/ninjatrader.ts` -- same fallback
5. `src/lib/parsers/quantconnect.ts` -- same fallback (replace simplified `price * qty * 0.001` with proper calculation)

The quantconnect parser has an additional bug: it uses `price * qty * 0.001` as a "simplified" PnL which is always wrong. This will be replaced with proper price-based calculation.

