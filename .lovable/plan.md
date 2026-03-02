

## Strategy Page Redesign: Folders + Cleaner Layout

### Problem
The Strategies page is cluttered -- the toolbar has 8 buttons crammed into one row, and there's no way to permanently organize strategies into custom folders. The current "Strategy Class" grouping is just a display filter, not a real filing system.

### Solution Overview
1. **Add a persistent Folders system** -- user-created folders stored in the database, with drag-and-drop or menu-based assignment
2. **Clean up the toolbar** -- move bulk actions into a contextual action bar that only appears when strategies are selected
3. **Integrate folders into the sidebar** -- folders appear in the left filter panel as a tree, replacing the flat strategy class filter as the primary organizer

---

### 1. Database: `strategy_folders` Table

Create a new table to store user folders:

- `id` (uuid, PK)
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `color` (text, default '#666666')
- `parent_id` (uuid, nullable, self-referencing for nested folders)
- `sort_order` (integer, default 0)
- `created_at` (timestamptz)

Add a `folder_id` column to the `strategies` table (nullable uuid).

RLS policies: users can only CRUD their own folders.

### 2. Cleaner Toolbar Layout

**Before (8 buttons in one row):**
Sort | Recompute All | Tag Manager | Select All | Add to Dashboard | Compare | Create Portfolio | Upload

**After (split into two tiers):**

**Top bar**: Title + strategy count | Sort dropdown | Upload button (primary action)

**Selection action bar** (appears only when 1+ strategies are checked):
- Selected count indicator
- Select All / Deselect All
- Add to Dashboard
- Compare
- Create Portfolio
- Move to Folder (new)

**Overflow menu** (three-dot menu for less-used actions):
- Recompute All
- Tag Manager

### 3. Folder Panel in FilterSidebar

Replace the current flat filter list with a folder tree at the top of the sidebar:

```text
FOLDERS
  [+] New Folder
  > All Strategies (count)
  > Uncategorized (count)
  > My Momentum Strats (count)
  > Experimental (count)
    > Sub-folder (count)
```

- Clicking a folder filters to only show strategies in that folder
- "All Strategies" shows everything (default)
- Right-click or "..." menu on folders for rename/delete/change color
- The existing class/timeframe/engine filters remain below the folder tree

### 4. Assigning Strategies to Folders

- Each strategy card gets a small folder icon or "Move to..." option via right-click/menu
- When strategies are selected (checkboxes), the action bar shows "Move to Folder" with a dropdown
- Strategies default to `folder_id = null` (shown under "Uncategorized")

---

### Technical Details

**New files:**
- `src/components/strategies/FolderTree.tsx` -- folder tree component with create/rename/delete inline
- `src/hooks/use-folders.ts` -- CRUD hooks for folders (useQuery, useMutation)

**Modified files:**
- `src/pages/Strategies.tsx` -- split toolbar into top bar + contextual selection bar; add folder filtering state; pass `folderId` to save/update
- `src/components/strategies/FilterSidebar.tsx` -- add FolderTree section above existing filters; accept `selectedFolderId` and `onFolderSelect` props
- `src/hooks/use-strategies.ts` -- add `folderId` to `useUpdateStrategy` input; filter by folder in `useStrategies` if needed
- `src/types/index.ts` -- add `StrategyFolder` interface and `folderId?: string` to `Strategy`

**Database migration:**
```sql
CREATE TABLE public.strategy_folders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL,
  color text DEFAULT '#666666',
  parent_id uuid REFERENCES public.strategy_folders(id) ON DELETE SET NULL,
  sort_order integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.strategy_folders ENABLE ROW LEVEL SECURITY;

-- RLS policies for strategy_folders (SELECT, INSERT, UPDATE, DELETE for own rows)

ALTER TABLE public.strategies
  ADD COLUMN folder_id uuid REFERENCES public.strategy_folders(id) ON DELETE SET NULL;
```

**Folder hooks (`use-folders.ts`):**
- `useFolders()` -- fetch all user folders
- `useCreateFolder()` -- create new folder
- `useUpdateFolder()` -- rename/recolor
- `useDeleteFolder()` -- delete (strategies move to uncategorized)
- `useMoveToFolder()` -- update `strategies.folder_id`

**Toolbar restructure:**
- Primary row: h1 title, subtitle, sort dropdown, upload button
- Selection bar (conditional): appears below when `compareIds.length > 0`, contains all bulk actions + "Move to Folder" dropdown
- Recompute All and Tag Manager move to a DropdownMenu (three-dot icon)

