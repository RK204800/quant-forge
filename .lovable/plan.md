

## Fix: Combined Portfolio Equity Showing Restricted Date Range

### Problem
The combined portfolio equity curve appears to show only a partial date range instead of the full timeline. Two likely causes:

1. **Timestamp string comparison issue**: The merge logic uses `sorted[pointers[si]].timestamp <= ts` which does lexicographic string comparison. Database `timestamptz` values can come back in varying formats (e.g., `2024-01-15T14:30:00+00:00` vs `2024-01-15T14:30:00.000Z`), causing string comparison to fail and skip data points.

2. **No sorting guarantee in EquityCurve component**: The `EquityCurve` chart component filters for finite values but never sorts by timestamp, relying on the caller to provide sorted data. If the combined curve has any ordering issues, the chart renders incorrectly.

3. **Potential data density issue**: When strategies have many intraday equity points, the merged curve can have thousands of points. Recharts renders all of them but shows only ~10 X-axis labels, which can make the visible range look narrow.

### Solution

**File: `src/pages/PortfolioDetail.tsx`** — Fix the merge to use numeric (epoch) timestamps instead of string comparison:
- Convert all timestamps to epoch milliseconds for sorting and comparison
- This eliminates any string format inconsistency from the database
- Keep the original timestamp string for the output

**File: `src/components/dashboard/EquityCurve.tsx`** — Add defensive sorting and optional downsampling:
- Sort `validData` by timestamp before charting
- If data has more than ~500 points, downsample to ~500 evenly-spaced points for chart rendering (keeps first, last, and peaks)
- Add a subtitle showing the actual date range (first date – last date) so the user can confirm the full span is present

### Files Modified
- `src/pages/PortfolioDetail.tsx` — epoch-based timestamp merge
- `src/components/dashboard/EquityCurve.tsx` — sort + downsample + date range label

