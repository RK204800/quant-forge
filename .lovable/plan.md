

## Remove Row Limits on Strategy Data

### Problem
Database read queries cap trade and equity curve fetches at 10,000 rows. For the strategies list view, this 10,000 limit is shared across ALL strategies -- meaning with 18+ strategies, individual strategies may have their data silently truncated. Individual strategy detail views also cap at 10,000 trades.

### Changes

**File: `src/hooks/use-strategies.ts`**

Replace the single bulk query approach with paginated fetching that retrieves all rows:

1. **Create a `fetchAll` helper function** that paginates through results using Supabase's `range()` method (fetching in chunks of 5,000) until all rows are retrieved. This removes the hard 10,000 cap.

2. **Update `useStrategies` (line 92-94)**: Replace `.limit(10000)` calls with the `fetchAll` helper for both trades and equity_curves queries.

3. **Update `useStrategy` (line 147-148)**: Same change for the single-strategy detail query.

4. **Update `useRecomputeStrategy` (line 330-332)**: Remove `.limit(10000)` and use `fetchAll`.

5. **Update `useRecomputeAllStrategies` (line 482-484)**: Same change.

### Technical Details

The `fetchAll` helper:
```text
async function fetchAll(query): Promise<rows[]>
  - Uses .range(offset, offset + PAGE_SIZE - 1) in a loop
  - Continues until a page returns fewer rows than PAGE_SIZE
  - Concatenates all pages and returns the full dataset
  - PAGE_SIZE = 5000 (well under Supabase's max response size)
```

This approach:
- Removes all artificial row limits
- Keeps the batch insert size at 500 (this is fine -- it's just chunking, not limiting)
- Handles strategies with any number of trades
- No database migration needed

