

## Add Dashboard & Portfolio Actions to Strategies Page

### Overview
Add two new action buttons to the Strategies page toolbar (next to Compare and Upload) that work with the existing checkbox selection:

1. **"Add to Dashboard"** button -- bulk-toggle `show_on_dashboard` for selected strategies
2. **"Create Portfolio"** green button -- navigates to the Portfolio page with selected strategy IDs

Also update the Portfolio page to accept strategy IDs via URL params and use real database strategies instead of mock data.

### Changes

**1. Update `src/pages/Strategies.tsx`**
- Import `useToggleDashboard` from hooks
- Add a **"Add to Dashboard"** button (with LayoutDashboard icon) next to Compare:
  - Enabled when 1+ strategies are selected via checkboxes
  - On click, calls `useToggleDashboard` for each selected strategy ID, setting `show_on_dashboard = true`
  - Shows toast confirmation "X strategies added to dashboard"
- Add a **"Create Portfolio"** button with green styling (`bg-green-600 hover:bg-green-700 text-white`):
  - Enabled when 2+ strategies are selected
  - On click, navigates to `/portfolio?ids=id1,id2,...`
  - Placed between Compare and Upload buttons

**2. Update `src/pages/Portfolio.tsx`**
- Replace `mockStrategies` with real data from `useStrategies()` hook
- Read `ids` query parameter from URL (`useSearchParams`)
- If `ids` param present, filter strategies to only those IDs
- If no `ids` param, show all strategies (backward compatible)
- Initialize weights equally among the filtered strategies
- Keep the existing weighted equity curve combination logic

### No database changes needed
- `show_on_dashboard` column already exists
- `useToggleDashboard` hook already exists
- Portfolio page just needs to use real data and accept URL params

### UI Layout (toolbar area)
```text
[Sort] [Recompute All] [Tags] [Select All] [Add to Dashboard] [Compare (N)] [Create Portfolio] [Upload]
```

The "Create Portfolio" button will be green to make it visually distinct, appearing only when 2+ strategies are selected (otherwise outline style).

### Files to modify
- `src/pages/Strategies.tsx` -- Add two new action buttons using existing checkbox selection
- `src/pages/Portfolio.tsx` -- Use real strategies from database, accept `ids` query param

