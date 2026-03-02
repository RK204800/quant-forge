

## Add "Add to Portfolio" from Dashboard and Strategy Detail

### Overview
Add the ability to send strategies to the Portfolio Builder from two additional views: the main Dashboard (strategy cards) and the individual Strategy Detail page.

### Changes

**1. Strategy Detail page** (`src/pages/StrategyDetail.tsx`)
- Add a "Portfolio" button (Briefcase icon) in the header next to the existing Back link and badges
- Clicking it navigates to `/portfolio?ids=<strategyId>`
- If a portfolio already has strategies in the URL, it appends the current strategy ID

**2. Dashboard strategy cards** (`src/pages/Index.tsx`)
- Add a "Portfolio" option to each strategy card's hover actions (alongside the existing remove-from-dashboard X button)
- Use a small Briefcase icon button that appears on hover
- Clicking navigates to `/portfolio?ids=<strategyId>`

**3. Dashboard per-card action menu** (`src/pages/Index.tsx`)
- Add a three-dot menu (MoreVertical) on each dashboard strategy card with:
  - "Add to Portfolio" -- navigates to `/portfolio?ids=<id>`
  - "Remove from Dashboard" -- existing toggle functionality
  - "View Details" -- navigates to `/strategies/<id>`

**4. Strategy Detail per-card action** (`src/pages/StrategyDetail.tsx`)
- Add a "Add to Portfolio" button in the header bar area, styled as an outline button with Briefcase icon

### Technical Notes

- The Portfolio page already reads `ids` from URL search params and initializes `selectedIds` from them
- Navigation uses `react-router-dom`'s `useNavigate` with path `/portfolio?ids=<comma-separated-ids>`
- No database changes needed -- this is purely frontend navigation

### Files to modify
- `src/pages/Index.tsx` -- add per-card action menu with Portfolio option
- `src/pages/StrategyDetail.tsx` -- add Portfolio button in header
