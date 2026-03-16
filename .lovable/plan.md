

## Fix: Strategy Tiles Not Showing Results + Portfolio View Issues

### Investigation Summary

Verified that all NinjaTrader trade data exists correctly in the database (32, 12, 9 trades for recent uploads). The issue appears to be a combination of:

1. **Confirmed bug**: Portfolio view double-multiplies win rate (shows 5000% instead of 50%)
2. **Cache staleness**: After saving strategies, the navigation to `/strategies` may happen before the query cache has fully refreshed, leaving tiles showing stale/empty data
3. **No NaN/Infinity guards**: Metrics like `profitFactor` can be `Infinity` (no losing trades), displaying as "Infinity" instead of a meaningful value

### Changes

#### 1. `src/hooks/use-strategies.ts` — Fix cache refresh after save

In `useSaveStrategy.onSuccess`, await the cache invalidation so the data is guaranteed fresh before navigation. Also add `refetchType: "all"` to force all active queries to refetch immediately.

#### 2. `src/pages/UploadStrategy.tsx` — Wait for cache before navigating

Change the post-save navigation to explicitly await `queryClient.refetchQueries` for the strategies key before navigating, instead of a blind 500ms timeout.

#### 3. `src/pages/PortfolioDetail.tsx` — Fix win rate double multiplication

Line 184: `(pm.winRate * 100)` is wrong since `calculateMetrics` already returns win rate as 0-100. Remove the `* 100`.

#### 4. `src/pages/Index.tsx` + `src/pages/Strategies.tsx` — Add NaN/Infinity guards

Wrap metric display values with a safe formatter that replaces `NaN` with "—" and caps `Infinity` at a readable "∞" or "999.99".

### Files to Modify
- `src/hooks/use-strategies.ts` — Improve cache invalidation
- `src/pages/UploadStrategy.tsx` — Await cache refresh before navigation
- `src/pages/PortfolioDetail.tsx` — Fix winRate display
- `src/pages/Index.tsx` — Add safe metric formatting
- `src/pages/Strategies.tsx` — Add safe metric formatting

