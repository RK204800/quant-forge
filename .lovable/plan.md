

## Add Upload Button to the Top Header Bar

### Problem
The Upload button is buried in the Strategies page toolbar among many other action buttons, making it hard to find. The user wants it prominently placed in the global header bar, next to the "Active Strategies" stat.

### Solution
Add an "Upload Strategy" button to the `TopStatsBar` component (the header bar visible on every page). This makes it always accessible regardless of which page the user is on.

### Changes

**`src/components/layout/TopStatsBar.tsx`**
- Import `Link` from `react-router-dom`, `Plus` icon from `lucide-react`, and `Button` from the UI library
- Add an upload button after the "Active Strategies" stat, separated by a divider
- Style it as a small primary button with a "+" icon and "Upload" label
- Links to `/strategies/upload`

### Layout
```text
[Total P&L] | [Total Trades] | [Max Drawdown] | [Active Strategies] | [+ Upload]
```

The button will be compact (`size="sm"`) and use the primary style so it stands out as a clear call-to-action in the header. It will be visible from any page in the app.

