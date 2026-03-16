

## Change Default Strategy Sort to Most Recent First

### Current Behavior
The Strategies page defaults to sorting by `profitFactor` (line 57 in `src/pages/Strategies.tsx`), which shows the highest profit factor strategies first. This means newly uploaded strategies may appear at the bottom of the list if they have lower performance metrics.

### Proposed Change
Change the default sort field from `"profitFactor"` to `"dateAdded"` so that the most recently uploaded strategies appear first in the list by default.

### Technical Details

**File to modify**: `src/pages/Strategies.tsx`

**Line 57**: Change the initial state from:
```typescript
const [sortField, setSortField] = useState<SortField>("profitFactor");
```

to:
```typescript
const [sortField, setSortField] = useState<SortField>("dateAdded");
```

This leverages the existing sort logic (lines 128-129) that already sorts by creation date in descending order when `sortField === "dateAdded"`.

### Impact
- Users will see their latest uploads at the top of the list immediately
- The sort dropdown will show "Date Added" as selected by default
- Users can still manually change to any other sort option (Profit Factor, Sharpe, etc.)
- The sorting logic itself remains unchanged

