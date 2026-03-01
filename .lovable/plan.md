

## Two Features: Manual Re-mapping Button + Portfolio Add/Remove

### 1. Manual Column Mapping Trigger

Currently the column mapper only appears when auto-detection fails (0 trades). You need a way to force it open when auto-detection produces incorrect results.

**Changes:**

**`src/components/upload/UploadZone.tsx`**
- Add a "Manual Map" button that appears after a file has been successfully parsed and added to the queue
- Add a new prop/callback or internal state so users can click "Re-map columns" on any queued file
- Alternatively, add a persistent "Map columns manually" link next to the upload zone that lets users re-upload a file and go straight to the mapper

**`src/pages/UploadStrategy.tsx`**
- Add a "Re-map" button on each queue item card (next to the remove X button)
- When clicked, it stores that item's raw content/headers and opens the ColumnMapper for it
- On successful re-mapping, replace that queue item's `ParseResult` with the new one
- This requires storing the raw file content alongside each queue item

**Implementation detail:**
- Extend `QueueItem` to include `rawContent?: string` and `headers?: string[]` and `sampleRows?: Record<string, string>[]`
- When files are parsed (both auto and manual), store the raw content so re-mapping is always available
- Add a `ColumnMapper` render in `UploadStrategy.tsx` that targets a specific queue item for re-mapping

### 2. Portfolio Builder: Add/Remove Strategies

Currently the Portfolio page only accepts strategies via URL params set from the Strategies page. You can't add or remove strategies once you're on the page.

**Changes:**

**`src/pages/Portfolio.tsx`**
- Add local state `selectedIds` initialized from URL params, replacing the read-only `idsParam` approach
- Add an "Add Strategy" button that opens a dropdown/dialog listing all available strategies not yet in the portfolio
- Add an "X" remove button on each strategy card to remove it from the portfolio
- When strategies change, update the URL search params to keep it shareable
- Show the empty state with an "Add Strategies" button when no strategies are selected

**Specific UI additions:**
- Each strategy card gets a small X (remove) button in the card header
- An "Add Strategy" button below the strategy cards grid opens a popover listing available strategies with checkboxes
- Removing a strategy also cleans up its weight from state

### Technical Details

**QueueItem extension (UploadStrategy.tsx):**
```
interface QueueItem {
  // ...existing fields
  rawContent?: string;
  headers?: string[];
  sampleRows?: Record<string, string>[];
}
```

**Portfolio state management:**
- Replace `useMemo` filter with `useState<string[]>` initialized from URL params
- Use `useSearchParams` setter to sync URL when selections change
- Filter `allStrategies` against `selectedIds` for display

**Files to modify:**
- `src/pages/UploadStrategy.tsx` -- add re-map button per queue item, store raw content, render ColumnMapper for re-mapping
- `src/components/upload/UploadZone.tsx` -- pass raw content through to parent via `ParsedFile`
- `src/pages/Portfolio.tsx` -- add/remove strategy UI with local state and URL sync

