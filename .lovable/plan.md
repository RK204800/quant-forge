

## Add/Remove Strategies from Dashboard

### Current Behavior
The dashboard shows ALL strategies and uses the first one as the "primary" deep-dive. There's no way to control which strategies appear.

### Approach
Add a `show_on_dashboard` boolean column to the `strategies` table (default `true` so existing strategies remain visible). The dashboard will filter to only show pinned strategies, and provide UI to add/remove them.

### Changes

**1. Database Migration**
- Add `show_on_dashboard boolean DEFAULT true` to the `strategies` table
- Existing strategies will automatically appear on dashboard (backward compatible)

**2. Update `src/hooks/use-strategies.ts`**
- Add a `useToggleDashboard(id, current)` hook (similar to existing `useToggleFavorite`) that flips `show_on_dashboard`
- Update `useUpdateStrategy` to accept `showOnDashboard` field

**3. Update `src/pages/Index.tsx`**
- Filter strategies to only those with `showOnDashboard === true`
- Add an "X" remove button on each strategy card to unpin it from dashboard
- Add an "Add Strategy" button/dropdown that lists strategies NOT on the dashboard, letting the user add them back
- When no strategies are pinned, show a prompt to add strategies (different from the "no strategies exist" empty state)
- Primary deep-dive uses the first pinned strategy

**4. Update `src/types/index.ts`**
- Add `showOnDashboard: boolean` to the `Strategy` type

**5. Update `mapDbStrategy` in `src/hooks/use-strategies.ts`**
- Map `show_on_dashboard` to the new field

### Technical Details

The remove button will be a small "X" icon in the top-right corner of each strategy card (with `e.preventDefault()` to avoid navigating to the strategy detail). The "Add Strategy" control will be a Popover with a checklist of all available strategies, showing checkmarks for those already on the dashboard.

No RLS changes needed -- the existing user-owned UPDATE policy covers this column.
