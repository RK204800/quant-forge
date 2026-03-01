

# Fix: Raise Trade Query Limit to 10,000

## Problem
The database client defaults to returning a maximum of 1,000 rows per query. All trade SELECT queries in `src/hooks/use-strategies.ts` omit an explicit limit, so strategies with more than 1,000 trades silently lose data when loading.

This affects:
- Strategy detail view (line 146) -- shows only first 1,000 trades
- Strategies list view (line 92) -- trades per strategy capped at 1,000
- Equity recomputation (line 323) -- rebuilds curve from incomplete data
- Batch recompute (line 474) -- same issue

Inserts are unaffected (already batched correctly at 500 rows).

## Fix

**File: `src/hooks/use-strategies.ts`** -- Add `.limit(10000)` to every trades query:

1. **Line 92** (strategies list): Add `.limit(10000)` to the trades select
2. **Line 146** (strategy detail): Add `.limit(10000)` to the trades select  
3. **Line 323** (recompute equity): Add `.limit(10000)` to the trades select
4. **Line 474** (batch recompute): Add `.limit(10000)` to the trades select

Also add `.limit(10000)` to the equity_curves queries (lines 93, 147) since a 10,000-trade strategy will have 10,001+ equity points.

## Technical Note
For the strategies list page (line 92), which loads trades for ALL strategies at once, this could potentially be a large query. The existing code already handles this by mapping trades per strategy, so no structural changes are needed -- just the limit increase.
