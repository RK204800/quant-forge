
# Fix Incorrect Strategy Calculations

## Problem Analysis

After tracing through the code with actual database data, I found **3 critical bugs** in `src/lib/analytics.ts` that cause wrong metrics:

### Bug 1: `getDailyReturns()` treats trade-level returns as daily returns
The function computes returns between consecutive equity curve points, but each point corresponds to a **trade exit** -- not a calendar day. If 5 trades happen over 20 trading days, the code produces 4 "daily" returns spanning 20 actual days. This massively inflates annualized return (e.g., showing ~137% instead of ~12%).

**Impact**: Annualized Return, Sharpe Ratio, Sortino Ratio, and Calmar Ratio are all wrong.

**Fix**: Resample the equity curve to actual calendar-day intervals before computing returns, so each return genuinely represents one trading day.

### Bug 2: `annualizedReturn` calculation doesn't account for actual time span
Even with resampled daily returns, annualized return should be computed from total return over the actual number of calendar days, not from average daily returns times 252.

**Fix**: Calculate annualized return as `(endEquity / startEquity)^(252 / actualTradingDays) - 1` for a proper CAGR-style metric.

### Bug 3: NaN values in chart tooltips
Console errors show "Received NaN for the children attribute" in the equity curve tooltip. This can occur when the drawdown or equity values produce NaN during rendering (e.g., division by zero edge cases in `maxDrawdown` when peak is 0, or when equity curve has a single point).

**Fix**: Add guards in the chart component's tooltip formatter and in the analytics calculations.

## Changes

### 1. Rewrite `src/lib/analytics.ts` - getDailyReturns and annualized metrics

- Replace `getDailyReturns()` with a version that interpolates equity to actual calendar days (filling forward on days without trades)
- Compute `annualizedReturn` using CAGR formula: `(finalEquity / initialEquity)^(365 / totalDays) - 1`
- Compute volatility from the properly resampled daily returns
- Add edge-case guards (single trade, same-day trades, zero equity)

### 2. Fix `src/components/dashboard/EquityCurve.tsx` - NaN tooltip guard

- Add a custom tooltip formatter that handles NaN/undefined values gracefully
- Ensure drawdown value is always a valid number before rendering

### 3. Fix equity curve drawdown calculation in parsers

The parsers (`backtrader.ts`, `tradingview.ts`, `ninjatrader.ts`, `quantconnect.ts`) all use an O(n^2) peak calculation:
```text
Math.max(runningEquity, ...equityCurve.map(e => e.equity), runningEquity)
```
This is redundant -- `runningEquity` is the current value, not necessarily the peak. Replace with a simple running `peak` variable tracked across iterations.

## Technical Details

The resampled daily returns approach:
1. Sort equity points by timestamp
2. Create a map of date-string to equity value
3. Fill forward: for each calendar day between first and last trade, use the most recent known equity
4. Compute returns from consecutive calendar days

This ensures Sharpe/Sortino/Calmar ratios are computed on actual daily frequency data, matching industry-standard methodology.
