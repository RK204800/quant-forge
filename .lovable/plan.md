

## Add Archive and Per-Card Actions to Strategies

### Overview
Add the ability to archive strategies (primary action) and delete them only as a secondary option. Archive moves strategies out of the main view into a virtual "Archived" folder. The existing `status` column on the `strategies` table already supports this -- no database migration needed.

### Changes

**1. Add hooks for archive and delete** (`src/hooks/use-strategies.ts`)

- `useArchiveStrategies(ids[])` -- sets `status = 'archived'` on the given strategy IDs, invalidates queries, shows toast
- `useRestoreStrategies(ids[])` -- sets `status = 'active'`, used from the Archived folder view
- `useDeleteStrategies(ids[])` -- cascade deletes: equity_curves, trades, strategy_tag_mapping, then strategies. Shows a toast. This is the destructive "permanent delete" option.

**2. Add "Archived" virtual folder** (`src/components/strategies/FolderTree.tsx`)

- Render below all user folders, with an `Archive` icon (from lucide)
- Selection ID: `"archived"`
- Count: number of strategies with `status === 'archived'`
- Drop target: dropping strategies onto it archives them

**3. Update "All Strategies" to exclude archived** (`src/pages/Strategies.tsx`)

- The `folderCounts.all` count excludes archived strategies
- The `folderFiltered` logic: when `selectedFolderId === null` (All), filter out `status === 'archived'`
- When `selectedFolderId === "archived"`, show only archived strategies

**4. Add per-card action menu** (`src/pages/Strategies.tsx`)

- Add a three-dot (`MoreVertical`) menu on each strategy card (right side, next to metrics)
- Menu items:
  - **Archive** (primary) -- archives the strategy
  - **Move to Folder** -- submenu with folder list
  - **Delete permanently** -- shows AlertDialog confirmation, then cascade deletes
- When viewing the Archived folder, the menu shows:
  - **Restore** -- sets status back to active
  - **Delete permanently** -- same confirmation dialog

**5. Add bulk archive and delete to selection bar** (`src/pages/Strategies.tsx`)

- Add **Archive** button (with Archive icon) in the selection action bar
- Add **Delete** button (with Trash2 icon, destructive style) -- shows AlertDialog confirming permanent deletion of N strategies
- When in Archived folder view, show **Restore** instead of Archive

**6. Confirmation dialog for delete** (`src/pages/Strategies.tsx`)

- Use existing AlertDialog components
- Title: "Permanently delete N strategy/strategies?"
- Description: "This will delete all trades, equity curves, and tags. This cannot be undone."
- Actions: Cancel / Delete permanently (destructive)

### Files to modify
- `src/hooks/use-strategies.ts` -- add `useArchiveStrategies`, `useRestoreStrategies`, `useDeleteStrategies`
- `src/pages/Strategies.tsx` -- per-card menu, bulk actions, archive folder filtering, delete confirmation dialog
- `src/components/strategies/FolderTree.tsx` -- add virtual "Archived" folder entry with drop support

### No database changes needed
The `strategies.status` column already exists with a default of `'active'`. Archive simply sets it to `'archived'`.

