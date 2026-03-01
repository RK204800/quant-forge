

## Display Negative Values in Red on Equity Curve

Currently the equity curve filters out values where `equity <= 0` (line 37) and always renders in green. This plan ensures negative PnL values are properly displayed and colored red.

### Changes

**1. `src/components/dashboard/EquityCurve.tsx`**

- **Remove the `> 0` filter** on line 37: change `data.filter((d) => isFinite(d.equity) && d.equity > 0)` to `data.filter((d) => isFinite(d.equity))` so negative equity values are kept.

- **Add a $0 ReferenceLine** to the chart (import `ReferenceLine` from recharts) -- a dashed line at y=0 to visually separate profit from loss territory.

- **Split the Area into two data series** to color positive green and negative red:
  - Add two computed fields to each chart data point: `equityPos` (equity when >= 0, else 0) and `equityNeg` (equity when < 0, else 0).
  - Render two `<Area>` components: one green for `equityPos`, one red for `equityNeg`.

- **Update Y-axis formatter** to handle negative and small values properly: use smart formatting instead of always dividing by 1000 (e.g., show `$500` instead of `$1k` for small values, and `-$2k` for negatives).

- **Update tooltip** to show the value with red color when negative: change the "Equity" tooltip entry to conditionally apply red (`hsl(0 72% 51%)`) or green (`hsl(142 70% 45%)`) color based on sign.

### Technical Details

- Import `ReferenceLine` from recharts alongside existing imports.
- Chart data mapping adds: `equityPos: Math.max(eq, 0)` and `equityNeg: Math.min(eq, 0)`.
- Two `<Area>` components replace the single one:
  - `equityPos`: stroke/fill green (`hsl(142 70% 45%)`)
  - `equityNeg`: stroke/fill red (`hsl(0 72% 51%)`)
- Y-axis tickFormatter: `(v) => { const abs = Math.abs(v); const label = abs >= 1000 ? \`$\${(abs/1000).toFixed(0)}k\` : \`$\${abs.toFixed(0)}\`; return v < 0 ? \`-\${label}\` : label; }`
- ReferenceLine at `y={0}` with dashed stroke on the equity yAxisId.
- CustomTooltip equity entry uses conditional color based on value sign.
- No changes needed to parsers, Portfolio page, or other files -- this is purely a display fix in the EquityCurve component.

