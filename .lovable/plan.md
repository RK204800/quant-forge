

## Fix: Portfolio Equity Curve Date Range Display

### Problem
The `EquityCurve` component formats all X-axis dates as `"MMM dd"` (e.g., "Mar 10"), dropping the year. When the portfolio's combined equity spans multiple months or years, the chart X-axis is misleading — dates from different years look identical, and `interval="preserveStartEnd"` hides most labels, making it appear like the data is restricted to a narrow window.

### Solution

**File: `src/components/dashboard/EquityCurve.tsx`**

1. **Smart date formatting** — Detect the time span of the data:
   - If span < 60 days: keep `"MMM dd"` format
   - If span < 2 years: use `"MMM dd ''yy"` (e.g., "Mar 10 '25")
   - If span >= 2 years: use `"MMM ''yy"` (e.g., "Mar '25")

2. **Better tick interval** — Replace `interval="preserveStartEnd"` with a calculated `interval` that shows ~8-12 evenly spaced tick labels regardless of data length. This ensures the full timeline is always visible with readable labels.

3. **Include year in tooltip** — Update the tooltip date display to always include the year so hovering shows the full date context.

### What Changes
- One file modified: `src/components/dashboard/EquityCurve.tsx`
- No data or merge logic changes needed — the combined curve already contains the full timeline; it's purely a display formatting issue

