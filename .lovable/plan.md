

## Fix Analytics for $0-Based Equity Curves

### Problem
After the equity curve recompute, all curves now start at $0 (cumulative PnL). But every analytics function in `src/lib/analytics.ts` uses percentage-based math that divides by equity values, causing:

- **Max Drawdown**: Shows absurd values like -6894% or -164% because it calculates `(peak - equity) / peak` where peak can be tiny (e.g., $2.75) and equity deeply negative (e.g., -$362), producing 13000%+ drawdown ratios
- **Annualized Return**: Always returns 0 because `startEquity <= 0` guard triggers (equity starts at $0)
- **Sharpe/Sortino/Calmar Ratios**: All 0 or broken because they depend on annualized return
- **Monthly Returns Heatmap**: Division by zero when monthly start equity is 0
- **Daily Returns**: Division by zero when previous day equity is 0

### Solution
Switch all calculations from percentage-of-equity to absolute-dollar-based metrics, which is the correct approach for cumulative PnL curves without a defined starting capital.

### Changes (single file: `src/lib/analytics.ts`)

**1. `maxDrawdown` -- Use absolute drawdown as a fraction of peak-to-trough range**
- Track peak equity and compute drawdown as absolute dollar amount: `peak - equity`
- Return the max absolute drawdown value (in dollars)
- Display it as a dollar value rather than a percentage (update MetricsGrid label)
- Alternative: use stored `drawdown` field from equity_curves which is already computed correctly during recompute

**2. `computeAnnualizedReturn` -- Handle zero-start curves**
- For $0-based curves, use additive return approach instead of geometric
- Calculate as `(finalEquity / totalDays) * 365` (annualized dollar return), or
- Use a notional capital approach: assume $10,000 notional, compute percentage return as `totalPnL / notional`

**3. `getResampledDailyReturns` -- Use dollar differences instead of percentage changes**
- Change from `(equity[i] - equity[i-1]) / equity[i-1]` to dollar differences
- For Sharpe/Sortino, use dollar-based standard deviation (still valid for ratio calculations when combined with dollar-based mean return)

**4. `getMonthlyReturns` -- Use dollar differences**
- Change from `(end - start) / start * 100` to `end - start` (absolute dollar change per month)
- Update MonthlyHeatmap display to show dollar values instead of percentages

**5. Update `MetricsGrid` display (`src/components/dashboard/MetricsGrid.tsx`)**
- Max Drawdown: show as dollar value `$X` instead of percentage `-X%`
- Annualized Return: show as dollar value or keep as percentage with notional capital

**6. Update `MonthlyHeatmap` (`src/components/dashboard/MonthlyHeatmap.tsx`)**
- Display monthly returns as dollar values instead of percentages

### Technical Details

The key insight is that cumulative PnL curves (starting at $0) are not the same as portfolio equity curves (starting at some capital). Percentage-based metrics require a capital base. The cleanest fix is:

1. For drawdown: use the pre-computed `drawdown` field from the equity curve data (already calculated correctly during recompute as `(peak - equity) / peak` with proper peak tracking), or fall back to absolute dollar drawdown
2. For Sharpe/Sortino: use dollar-based daily PnL differences (not returns), which is standard practice for futures/derivatives trading analytics
3. For monthly heatmap: show dollar PnL per month (more intuitive for traders anyway)
4. For annualized return: display total return and annualized dollar PnL rather than trying to compute a meaningless percentage

### Files to modify
- `src/lib/analytics.ts` -- Core calculation fixes
- `src/components/dashboard/MetricsGrid.tsx` -- Update Max Drawdown display format
- `src/components/dashboard/MonthlyHeatmap.tsx` -- Update to dollar-based display
- `src/pages/Index.tsx` -- Update Max DD display in strategy cards
