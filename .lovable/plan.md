

## Persistent Portfolio System

### Overview
Transform the current ephemeral portfolio builder into a full persistent workflow. Users can create named portfolios, save them to the database, and add strategies to specific portfolios from anywhere in the app (Dashboard cards, Strategy Detail, Strategies page).

### Database Changes

**New table: `portfolios`**
- `id` (uuid, PK, default gen_random_uuid())
- `user_id` (uuid, NOT NULL)
- `name` (text, NOT NULL)
- `description` (text, default '')
- `created_at` (timestamptz, default now())
- `updated_at` (timestamptz, default now())

**New table: `portfolio_strategies`**
- `id` (uuid, PK, default gen_random_uuid())
- `portfolio_id` (uuid, NOT NULL, FK -> portfolios.id ON DELETE CASCADE)
- `strategy_id` (uuid, NOT NULL, FK -> strategies.id ON DELETE CASCADE)
- `weight` (numeric, NOT NULL, default 0)
- `created_at` (timestamptz, default now())
- UNIQUE constraint on (portfolio_id, strategy_id)

Both tables get RLS policies restricting all operations to `auth.uid() = user_id` (for portfolios) and ownership via join to portfolios (for portfolio_strategies).

An `update_updated_at` trigger on portfolios to keep `updated_at` current.

### New Hooks (`src/hooks/use-portfolios.ts`)

- `usePortfolios()` -- fetches all user portfolios with strategy counts
- `usePortfolio(id)` -- fetches single portfolio with its strategies and weights
- `useCreatePortfolio()` -- creates a new portfolio, returns the new ID
- `useUpdatePortfolio()` -- updates name/description
- `useDeletePortfolio()` -- deletes a portfolio
- `useAddToPortfolio()` -- adds one or more strategy IDs to a portfolio (with default equal weights)
- `useRemoveFromPortfolio()` -- removes a strategy from a portfolio
- `useUpdateWeight()` -- updates a single strategy's weight in a portfolio

### "Add to Portfolio" Dialog Component (`src/components/portfolio/AddToPortfolioDialog.tsx`)

A reusable dialog that:
1. Shows a list of existing portfolios to pick from
2. Has a "Create New Portfolio" option at the top with an inline name input
3. Accepts `strategyIds: string[]` as a prop
4. On select: adds the strategies to that portfolio, shows a toast with a link to the portfolio

This dialog is used from:
- Dashboard card dropdown menu ("Add to Portfolio" item)
- Strategy Detail page ("Add to Portfolio" button)
- Strategies page per-card action menu

### Portfolio List Page (`src/pages/Portfolio.tsx` -- reworked)

The `/portfolio` route becomes a list of saved portfolios:
- Shows all portfolios as cards with name, strategy count, creation date
- "Create Portfolio" button opens a dialog to name a new portfolio
- Each card links to `/portfolio/:id`

### Portfolio Detail Page (`src/pages/PortfolioDetail.tsx` -- new)

The `/portfolio/:id` route shows the full builder for a specific saved portfolio:
- Portfolio name displayed as an editable header
- Strategy cards with weight sliders (persisted on change)
- Add/remove strategies
- Combined equity curve
- All the current builder logic, but reading from and writing to the database

### Routing Changes (`src/App.tsx`)

- `/portfolio` -- portfolio list
- `/portfolio/:id` -- portfolio detail/builder

### Sidebar Navigation

No changes needed -- the existing "Portfolio" link at `/portfolio` continues to work, now showing the list.

### Dashboard & Strategy Detail Updates

- Dashboard card dropdown: replace the current `navigate('/portfolio?ids=...')` with opening the `AddToPortfolioDialog`
- Strategy Detail: replace the navigate button with opening `AddToPortfolioDialog`

### Files to create
- `src/hooks/use-portfolios.ts`
- `src/components/portfolio/AddToPortfolioDialog.tsx`
- `src/pages/PortfolioDetail.tsx`

### Files to modify
- `src/pages/Portfolio.tsx` -- rewrite as portfolio list
- `src/App.tsx` -- add `/portfolio/:id` route
- `src/pages/Index.tsx` -- use AddToPortfolioDialog instead of direct navigate
- `src/pages/StrategyDetail.tsx` -- use AddToPortfolioDialog instead of direct navigate
- `src/pages/Strategies.tsx` -- add "Add to Portfolio" in per-card menu

### Technical Details

```text
portfolios              portfolio_strategies
+--------+             +------------------+
| id     |<---+        | id               |
| user_id|    +--------| portfolio_id     |
| name   |             | strategy_id      |
| desc   |             | weight           |
+--------+             +------------------+
```

Weights are stored as percentages (0-100). The combined equity curve calculation stays client-side, using the same logic currently in Portfolio.tsx but reading strategies from the portfolio's membership list.

