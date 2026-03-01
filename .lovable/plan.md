

# Multi-File Strategy Upload

## What Changes

Transform the upload page from a single-file, single-strategy flow into a batch upload experience where you can drop multiple CSV files at once -- each file becomes its own strategy.

## How It Works

1. **Drop zone accepts multiple files** -- drag 5 CSVs at once, or click to multi-select
2. Each file is parsed independently and shown as a row in a queue
3. Each row has: file name, auto-detected format, trade count, a name input field, status indicator, and a remove button
4. File names are used as default strategy names (without extension), editable inline
5. A single "Save All" button saves all strategies sequentially
6. As each saves, its row shows a checkmark; on error, it shows the error inline
7. After all save, navigate to the strategies list page

## Files to Change

### `src/components/upload/UploadZone.tsx`
- Change `onParsed` callback to `onParsed: (results: ParseResult[]) => void` (array)
- Add `multiple` attribute to the file input
- Handle `e.dataTransfer.files` as a full `FileList` (loop all files, not just `[0]`)
- Parse each file independently, collecting results
- Show file count indicator instead of single file name
- Keep drag-and-drop styling and sample download buttons as-is

### `src/pages/UploadStrategy.tsx`
- Replace single `result` / `name` state with an array of `{ result: ParseResult, name: string, status: 'pending' | 'saving' | 'saved' | 'error', error?: string }` items
- On parse callback, append new items to the queue (don't replace -- allows adding more files)
- Render a queue list: each item shows file format badge, trade count, inline name input, remove button
- Expandable preview: clicking a row shows its MetricsGrid and EquityCurve below
- "Save All" button iterates through pending items, calling `useSaveStrategy` for each
- Progress indicator shows "Saving 2/5..." during batch save
- After all saved, navigate to `/strategies`
- Keep the single-file flow working too (uploading one file is just a queue of one)

## UI Layout

```text
+--------------------------------------------------+
| Upload Strategies                                 |
| Import backtest results from your trading platform|
+--------------------------------------------------+
| [  Drop files here or click to browse  ]          |
|    Supports multiple files at once                |
+--------------------------------------------------+
| Queue (3 files)                              [Save All] |
| +-------------------------------------------------+
| | momentum_v2.csv  | TradingView | 142 trades    |
| | [Momentum v2___________] | [x]                  |
| +-------------------------------------------------+
| | mean_revert.csv  | Backtrader  | 87 trades     |
| | [Mean Revert___________] | [x]                  |
| +-------------------------------------------------+
| | scalper.csv      | Generic     | 310 trades    |
| | [Scalper_______________] | [x]                  |
| +-------------------------------------------------+
```

Clicking a row expands to show a preview of MetricsGrid + EquityCurve for that strategy.

## Technical Details

- No database changes needed -- reuses `useSaveStrategy` mutation for each item
- Parsing is done client-side and is fast; files are processed in parallel using `Promise.all`
- Save is sequential to avoid overwhelming the database with concurrent batch inserts
- File input gets `multiple` attribute and `accept=".csv,.json,.txt"`
- Drag-and-drop processes all files from `e.dataTransfer.files` via loop

