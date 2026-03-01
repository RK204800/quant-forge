

# World-Class Performance Analytics Suite

## Overview

This is a major feature build adding institutional-grade analytics across both individual strategies and portfolios. It includes time-based analysis, R:R optimization from MAE data, Monte Carlo simulation, risk of ruin analysis, and robustness testing -- all computed client-side from trade data.

## Part 1: Core Data Model Updates

### `src/types/index.ts`

Add new fields and interfaces:

- **Trade interface**: Add optional `mae` (Maximum Adverse Excursion) and `mfe` (Maximum Favorable Excursion) fields. These represent the worst and best unrealized P&L during a trade. Parsers will read them from CSV columns if available (NinjaTrader exports these natively as "MAE" and "MFE").
- **ExtendedMetrics interface**: Adds grossProfit, grossLoss, totalCommission, maxConsecWins, maxConsecLosses, avgTradesPerDay, profitPerMonth (based on ~22 trading days/month), maxRecoveryDays, startDate, endDate.
- **MonteCarloResult interface**: percentiles (P5/P25/P50/P75/P95) for final equity, max drawdown, and risk of ruin probability at configurable thresholds.
- **RROptimizationResult interface**: for each tested R:R ratio -- projected win rate, profit factor, expectancy, total return, number of trades that would survive the stop.

## Part 2: Analytics Engine Expansion (`src/lib/analytics.ts`)

### Profit Per Month
- Calculate using trading days: `totalNetProfit / (totalTradingDays / 22)` where totalTradingDays is derived from unique trading days in the dataset (not calendar days). This ensures the metric reflects actual trading frequency.

### Extended Metrics Helper
- `calculateExtendedMetrics(trades, equityCurve)`: computes all fields in ExtendedMetrics, splitting by direction for the 3-column All/Long/Short summary.
- Consecutive win/loss streak counter.
- Max recovery time: longest period (in calendar days) between a drawdown trough and the subsequent equity high that exceeds the previous peak.

### New file: `src/lib/monte-carlo.ts`

Monte Carlo simulation engine:
- Takes trade P&L array and number of simulations (default 1000).
- Each simulation: randomly samples (with replacement) from the trade P&L array for N trades, building a synthetic equity curve.
- Outputs percentile bands (P5, P25, P50, P75, P95) for: final equity, max drawdown, longest drawdown duration.
- **Risk of Ruin**: percentage of simulations where equity drops below a configurable threshold (e.g., 50% of starting capital).
- Supports portfolio-level simulation by combining trade arrays from multiple strategies.

### New file: `src/lib/rr-optimizer.ts`

R:R Optimization engine using MAE/MFE data:
- For each candidate R:R ratio (e.g., 0.5:1 through 5:1 in 0.25 steps):
  - For each trade, check if MAE exceeded the implied stop (i.e., would the trade have been stopped out?). If MAE data is unavailable, estimate from entry/exit prices and direction.
  - Calculate the implied target from the stop * R:R ratio.
  - Determine if MFE reached the target (trade wins) or MAE hit the stop first (trade loses).
  - Compute projected: win rate, avg win, avg loss, profit factor, expectancy, total P&L.
- Output a table and chart showing how each R:R ratio would have performed.

### New file: `src/lib/robustness.ts`

Additional robustness analyses:
- **Walk-Forward Efficiency**: Split trades into N segments (e.g., 5), calculate metrics for each segment, measure consistency.
- **Return Distribution Analysis**: Skewness and kurtosis of trade returns -- tells you if returns are normally distributed or fat-tailed.
- **Regime Detection**: Split equity curve into periods of positive vs negative drift, report % time in each regime and metrics per regime.
- **Stability Score**: Composite 0-100 score combining Sharpe consistency, drawdown recovery speed, win rate stability, and profit factor across segments.

## Part 3: Strategy Detail Page Redesign (`src/pages/StrategyDetail.tsx`)

Reorganize into a 5-tab interface using Radix Tabs:

```text
[Overview] [Analysis] [Performance] [Robustness] [Trade Log]
```

### Overview Tab (existing, refined)
- MetricsGrid, EquityCurve (with toggleable overlays), TradeDistribution, MonthlyHeatmap

### Analysis Tab (new)
Sub-tabs: `Trades | Time of Day | Day of Week | Daily | Weekly | Monthly`
- **Time of Day**: entry time OR exit time toggle (dropdown selector), 30-min bucket bar chart + summary table
- **Trades**: sequential bar chart per trade
- **Day of Week / Daily / Weekly / Monthly**: bar charts with summary tables

### Performance Tab (new)
- 3-column summary (All / Long / Short) with all ExtendedMetrics
- Expectancy curve (rolling window)
- Streak analysis chart
- Rolling Sharpe

### Robustness Tab (new)
- Monte Carlo simulation with equity fan chart (percentile bands)
- Risk of Ruin gauge/indicator
- R:R Optimizer chart and table (if MAE data available; otherwise shows message about adding MAE columns)
- Walk-forward consistency chart
- Stability score card

### Trade Log Tab (existing, enhanced)
- Add cumulative P&L and return % columns

## Part 4: Equity Curve Improvements (`src/components/dashboard/EquityCurve.tsx`)

- Default to equity-only (no drawdown bars)
- ToggleGroup buttons in header: Drawdown, Peak Equity, Daily Returns
- Toggles add/remove Recharts series dynamically

## Part 5: Parser Updates

All four parsers (backtrader, tradingview, ninjatrader, quantconnect):
- Insert initial equity point at starting balance (before first trade)
- Parse MAE and MFE columns if present (NinjaTrader exports these natively; other formats may include them)

## Part 6: Portfolio Analytics (`src/pages/Portfolio.tsx`)

Major upgrade from current mock-data-only page:
- Use real strategies from database instead of mock data
- **Portfolio Monte Carlo**: combine trade arrays from all weighted strategies, run Monte Carlo on the blended set
- **Portfolio Risk of Ruin**: run risk of ruin on the combined equity curve
- **Cumulative MAE analysis**: aggregate MAE across strategies to show portfolio-level adverse excursion
- **Combined drawdown analysis**: show portfolio max drawdown vs individual strategy drawdowns
- Fix O(n^2) peak calculation bug
- Add Portfolio Stability Score

## New Components Summary

| File | Purpose |
|------|---------|
| `src/components/dashboard/PeriodAnalysis.tsx` | Container with period toggle tabs |
| `src/components/dashboard/TradePnlChart.tsx` | Per-trade sequential bar chart + table |
| `src/components/dashboard/TimeOfDayChart.tsx` | 30-min bucket chart with entry/exit time selector |
| `src/components/dashboard/DayOfWeekChart.tsx` | Day-of-week bar chart + table |
| `src/components/dashboard/PeriodBarChart.tsx` | Reusable daily/weekly/monthly bar chart |
| `src/components/dashboard/PerformanceSummary.tsx` | 3-column All/Long/Short report |
| `src/components/dashboard/ExpectancyCurve.tsx` | Rolling expectancy line chart |
| `src/components/dashboard/StreakAnalysis.tsx` | Win/loss streak visualization |
| `src/components/dashboard/RollingSharpe.tsx` | Rolling Sharpe ratio chart |
| `src/components/dashboard/MonteCarloChart.tsx` | Fan chart with percentile bands + risk of ruin |
| `src/components/dashboard/RROptimizer.tsx` | R:R optimization table and chart |
| `src/components/dashboard/RobustnessScore.tsx` | Composite stability score card |
| `src/components/dashboard/WalkForwardChart.tsx` | Segment-by-segment consistency |
| `src/lib/monte-carlo.ts` | Monte Carlo simulation engine |
| `src/lib/rr-optimizer.ts` | R:R optimization from MAE/MFE |
| `src/lib/robustness.ts` | Walk-forward, regime detection, stability score |

## Files to Edit

| File | Changes |
|------|---------|
| `src/types/index.ts` | Add mae/mfe to Trade, new interfaces |
| `src/lib/analytics.ts` | Extended metrics, profit per month (22 trading days), by-direction splits, streaks, rolling calcs |
| `src/pages/StrategyDetail.tsx` | 5-tab layout |
| `src/pages/Portfolio.tsx` | Real data, Monte Carlo, risk of ruin, combined MAE |
| `src/components/dashboard/EquityCurve.tsx` | Toggleable overlays, remove default drawdown |
| `src/components/dashboard/TradesTable.tsx` | Add cumulative P&L, return % columns |
| `src/lib/parsers/backtrader.ts` | Initial equity point, MAE/MFE parsing |
| `src/lib/parsers/tradingview.ts` | Initial equity point, MAE/MFE parsing |
| `src/lib/parsers/ninjatrader.ts` | Initial equity point, MAE/MFE parsing |
| `src/lib/parsers/quantconnect.ts` | Initial equity point, MAE/MFE parsing |

## Implementation Sequence

1. Types and data model updates
2. Analytics engine (extended metrics, profit per month)
3. Monte Carlo and Risk of Ruin engine
4. R:R Optimizer engine
5. Robustness analysis engine
6. Parser updates (initial equity point + MAE/MFE)
7. Equity curve toggle improvements
8. All new chart/table components
9. StrategyDetail page with 5-tab layout
10. Portfolio page upgrade with Monte Carlo and combined analysis
11. TradesTable enhancements

