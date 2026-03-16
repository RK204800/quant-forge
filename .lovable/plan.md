
## Diagnosis

I traced this to the data-loading layer, not the NinjaTrader parser.

- The NinjaTrader uploads are being saved correctly. The database contains the recent strategies and their trade/equity rows, and the single strategy detail page works because it loads one strategy at a time.
- The broken views are the ones that depend on `useStrategies()`:
  - strategy tiles
  - dashboard cards
  - portfolio member stats

## Root Cause

`src/hooks/use-strategies.ts` has a bulk pagination helper:

```ts
const PAGE_SIZE = 5000;
```

But the backend read limit is effectively capped to 1000 rows per request.

That creates a subtle bug:
- the code asks for 5000 rows
- the backend returns only ~1000
- `fetchAll()` sees `data.length < PAGE_SIZE` and incorrectly assumes it reached the end
- it stops after the first page

Because the bulk queries are ordered oldest-first across all strategies, older strategies consume the first 1000 rows. Recent NinjaTrader strategies never get their trades/equity attached in list-based views, so their tiles and portfolio cards look empty even though the detail page works.

## Implementation Plan

1. **Fix pagination in `src/hooks/use-strategies.ts`**
   - Change the bulk page size to a safe value at or below the backend row cap
   - Make `fetchAll()` stop based on the actual page size being requested, not the old 5000 assumption

2. **Make paginated ordering deterministic**
   - Add stable secondary ordering to bulk paginated queries so rows aren’t skipped or duplicated across pages when timestamps are identical
   - Apply this to both trades and equity-curve queries

3. **Update all strategy-loading paths that use `fetchAll()`**
   - `useStrategies()`
   - `useStrategy()`
   - recompute flows that page through trades
   This keeps list pages, detail pages, and recompute actions consistent

4. **Re-verify the affected UI surfaces**
   - Strategies page tiles
   - Dashboard cards
   - Portfolio detail strategy cards and combined portfolio stats

## Technical Notes

- No database schema or RLS changes are needed
- No parser rewrite is needed
- The issue is specifically caused by bulk multi-strategy reads being truncated before newer NinjaTrader rows are reached
- The main file to change is `src/hooks/use-strategies.ts`

## Expected Result After Fix

- Recent NinjaTrader strategies will show populated metrics in tiles
- Adding them to portfolios will show their trade-driven stats correctly
- Portfolio aggregate calculations will include their real trades/equity instead of empty arrays
