

# JetQuant Major Feature Release

## Overview

Six major enhancements transforming QuantForge into JetQuant with professional-grade strategy management, trade visualization, and filtering capabilities.

---

## 1. Rebrand: QuantForge to JetQuant

**Files to change:**
- `src/components/layout/AppSidebar.tsx` -- sidebar logo text
- `src/pages/Auth.tsx` -- login page branding, placeholder email
- `src/pages/ResetPassword.tsx` -- reset page branding
- `src/App.tsx` -- loading spinner text
- `index.html` -- page title and meta tags

Simple find-and-replace of "QuantForge" with "JetQuant" across all references.

---

## 2. Inline Strategy Rename

**Files to change:**
- `src/pages/Strategies.tsx` -- add pencil icon button on each card
- `src/hooks/use-strategies.ts` -- add `useUpdateStrategy` mutation

Clicking the pencil icon opens a small inline input (or popover) over the strategy name. On blur or Enter, it saves via `supabase.from("strategies").update({ name }).eq("id", id)`. No re-upload needed.

---

## 3. Strategy Classes with Grouping

**Database migration:**
```sql
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS strategy_class TEXT;
```

**Files to change:**
- `src/types/index.ts` -- add `strategyClass` to Strategy interface
- `src/hooks/use-strategies.ts` -- map `strategy_class` field in DB mappers and save mutation
- `src/pages/Strategies.tsx` -- add class badge on cards, group cards by class with section headers
- `src/pages/UploadStrategy.tsx` -- add optional strategy class dropdown in queue items
- `src/pages/StrategyDetail.tsx` -- show class badge in header

Predefined class options: "RSI Strategy", "Breakout", "Mean Reversion", "ML Model", "A/D Strategy", "Momentum", "Scalping", "Custom" (with free text).

---

## 4. Trade Chart with lightweight-charts

**New dependency:** `lightweight-charts`

**Database/Backend:**
- Store Polygon.io API key as a secret (`POLYGON_API_KEY`)
- New edge function `supabase/functions/market-data/index.ts` that proxies requests to Polygon.io's `/v2/aggs/ticker/{ticker}/range/1/minute/{from}/{to}` endpoint

**New files:**
- `src/components/dashboard/TradeChart.tsx` -- lightweight-charts candlestick chart with trade markers

**Modified files:**
- `src/pages/StrategyDetail.tsx` -- add "Trade Chart" as 6th tab

**How it works:**
1. When the Trade Chart tab is opened, it reads the strategy's trades to determine the instrument and date range
2. Calls the edge function to fetch 1-min candle data from Polygon.io
3. Renders candlestick chart with `lightweight-charts`
4. Overlays markers: green up arrows at long entries, red down arrows at short entries, X markers at exits
5. Chart supports zoom, pan, and crosshair by default (built into lightweight-charts)

**Instrument mapping:** The edge function maps common instrument names (ES, NQ, etc.) to Polygon ticker symbols (e.g., ES -> ESM2024 or a futures symbol). We'll include a simple mapping table and fallback to the raw instrument name.

---

## 5. Strategy Parameters

**Database migration:**
```sql
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS parameters JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS parameter_template JSONB DEFAULT '{}'::jsonb;
```

**Files to change:**
- `src/types/index.ts` -- add `parameters` and `parameterTemplate` fields
- `src/hooks/use-strategies.ts` -- map new fields in DB mappers and save mutation
- `src/lib/parsers/ninjatrader.ts` -- detect and parse XML parameter templates (if content contains `<Parameter>` elements)
- `src/lib/parsers/index.ts` -- extend `ParseResult` with optional `parameters` field

**New files:**
- `src/components/dashboard/ParametersTable.tsx` -- clean table displaying parameter key-value pairs
- `src/components/dashboard/ParameterCompare.tsx` -- side-by-side comparison view for strategies in the same class, highlighting differences

**Modified files:**
- `src/pages/StrategyDetail.tsx` -- add Parameters section (either in Overview tab or as its own sub-section)
- `src/pages/Strategies.tsx` -- add "Compare" button when 2+ strategies share a class

---

## 6. Filing System: Favorites, Tags, Filters, Sorting

**Database migration:**
```sql
ALTER TABLE public.strategies ADD COLUMN IF NOT EXISTS is_favorite BOOLEAN DEFAULT false;

CREATE TABLE IF NOT EXISTS public.strategy_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#666666',
  created_at TIMESTAMPTZ DEFAULT now()
);
ALTER TABLE public.strategy_tags ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tags" ON public.strategy_tags FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own tags" ON public.strategy_tags FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own tags" ON public.strategy_tags FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own tags" ON public.strategy_tags FOR DELETE USING (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.strategy_tag_mapping (
  strategy_id UUID REFERENCES public.strategies(id) ON DELETE CASCADE,
  tag_id UUID REFERENCES public.strategy_tags(id) ON DELETE CASCADE,
  PRIMARY KEY (strategy_id, tag_id)
);
ALTER TABLE public.strategy_tag_mapping ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own tag mappings" ON public.strategy_tag_mapping FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
CREATE POLICY "Users can insert own tag mappings" ON public.strategy_tag_mapping FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
CREATE POLICY "Users can delete own tag mappings" ON public.strategy_tag_mapping FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.strategies WHERE id = strategy_id AND user_id = auth.uid()));
```

**Files to change:**
- `src/types/index.ts` -- add `isFavorite`, `strategyClass`, `tags` to Strategy; add `StrategyTag` type
- `src/hooks/use-strategies.ts` -- map new fields; add `useToggleFavorite`, `useTags`, `useAddTag`, `useRemoveTag` hooks

**New files:**
- `src/components/strategies/FilterSidebar.tsx` -- collapsible filter panel with checkboxes for Strategy Class, Timeframe, Engine, Asset Class, Status, Tags, Favorites
- `src/components/strategies/SortDropdown.tsx` -- sort by Profit Factor (default), Total Return, Sharpe, Sortino, Win Rate, Max Drawdown, Date Added
- `src/components/strategies/TagManager.tsx` -- create/edit/delete tags with color picker
- `src/components/strategies/TagBadges.tsx` -- display and assign tags on strategy cards

**Modified files:**
- `src/pages/Strategies.tsx` -- major rebuild:
  - Sidebar layout with FilterSidebar on the left
  - Sort dropdown in the header
  - Quick filter buttons: "Best performers" (top 10 by PF), "Favorites only", "Recently added"
  - Favorite toggle (heart/star icon) on each card
  - Tag badges on each card
  - Default sort: Profit Factor descending
  - Client-side filtering and sorting (all data already loaded)

---

## Implementation Sequence

1. Database migration (all schema changes in one migration)
2. Rebrand to JetQuant (quick text changes)
3. Type updates and hook changes (foundation for everything)
4. Inline rename (small, self-contained)
5. Strategy classes with grouping
6. Filing system (favorites, tags, filters, sorting)
7. Parameters parsing and display
8. Trade Chart with lightweight-charts + edge function + Polygon.io API key setup

---

## Technical Notes

- All new tables get RLS policies tied to `auth.uid() = user_id`
- The `strategy_tag_mapping` junction table uses strategy ownership for RLS (no `user_id` column on junction table itself)
- Filtering and sorting happen client-side since all strategies are already fetched
- The Polygon.io edge function caches responses to avoid repeated API calls for the same instrument/date range
- `lightweight-charts` is TradingView's open-source charting library -- perfect fit for trading terminal aesthetic
- Parameters are stored as JSONB for flexibility across different backtest engines

