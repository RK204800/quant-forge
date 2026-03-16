

## Enhance Portfolio Detail with Full Analysis

### Problem 1: Broken Combined Equity Curve
The current combined equity curve uses **index-based alignment** (line 73-86 in PortfolioDetail.tsx). It iterates by array index `i`, which means it aligns the 1st point of strategy A with the 1st point of strategy B regardless of their actual timestamps. Strategies with different date ranges or different numbers of equity points get misaligned, producing an incorrect combined curve.

**Fix**: Switch to **time-based merging**. Collect all unique timestamps across member strategies, sort chronologically, and at each timestamp interpolate each strategy's equity value using the most recent known point. Apply weights and sum to produce the combined curve.

### Problem 2: Missing Analysis Tabs
The strategy detail page has 6 tabs: Overview, Analysis, Performance, Robustness, Trade Chart, Trade Log. The portfolio detail page only shows summary metric cards, a combined equity curve, correlation matrix, and risk assessment.

**Fix**: Add the same tabbed layout to the portfolio detail page, operating on the combined/aggregated trade set (`allTrades = memberStrategies.flatMap(s => s.trades)`) and the corrected combined equity curve.

### Implementation Plan

**File: `src/pages/PortfolioDetail.tsx`**

1. **Fix combined equity curve** -- Replace the index-based loop with a time-sorted merge:
   - Collect all timestamps from all member strategies into a sorted set
   - For each timestamp, find each strategy's equity at that point (last known value)
   - Sum weighted equities and compute drawdown

2. **Add analysis imports** -- Import the same components used in StrategyDetail:
   - `MetricsGrid`, `MonthlyHeatmap`, `TradeDistribution`, `PeriodAnalysis`, `PerformanceSummary`, `ExpectancyCurve`, `RollingSharpe`, `StreakAnalysis`, `MonteCarloChart`, `RobustnessScore`, `RROptimizer`, `WalkForwardChart`, `TradesTable`, `getMonthlyReturns`

3. **Add Tabs structure** -- After the strategy weight cards, wrap the existing combined equity curve and new analysis components in a tabbed layout:
   - **Overview**: MetricsGrid, combined equity curve + trade distribution side by side, monthly heatmap
   - **Analysis**: PeriodAnalysis (trades, time-of-day, day-of-week, daily/weekly/monthly bars)
   - **Performance**: PerformanceSummary, ExpectancyCurve + RollingSharpe side by side, StreakAnalysis
   - **Robustness**: MonteCarloChart + RobustnessScore side by side, RROptimizer, WalkForwardChart
   - **Trade Log**: TradesTable
   - **Composition**: The existing correlation matrix and risk assessment (moved here)

4. **Compute aggregated data** -- Use `useMemo` for:
   - `allTrades`: flat merge of all member strategy trades
   - `combinedCurve`: time-based merged equity curve
   - `portfolioMetrics`: `calculateMetrics(allTrades, combinedCurve)`
   - `monthlyReturns`: `getMonthlyReturns(combinedCurve)`

### Technical Details: Time-Based Equity Merge

```text
Strategy A:  t1=100  t3=120  t5=130
Strategy B:  t2=50   t3=60   t4=70

Merged timeline: t1, t2, t3, t4, t5
At t1: A=100, B=0 (no data yet)
At t2: A=100 (carry forward), B=50
At t3: A=120, B=60
At t4: A=120 (carry forward), B=70
At t5: A=130, B=70 (carry forward)

Combined = weighted sum at each timestamp
```

### Files Modified
- `src/pages/PortfolioDetail.tsx` (primary -- restructure with tabs, fix equity merge)

