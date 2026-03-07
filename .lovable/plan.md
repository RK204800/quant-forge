

## Remove Polygon / Market Data Integration

Remove all Polygon API and market-data edge function code. The TradeChart will keep working using only synthetic candles from trade data.

### Changes

#### 1. Delete `supabase/functions/market-data/index.ts`
Remove the entire edge function.

#### 2. Simplify `src/components/dashboard/TradeChart.tsx`
- Remove `fetchCandles` function and all Polygon-related code
- Remove `loading`, `error`, `mode` state variables
- Remove the "Load 1m Candles" button, `Loader2` and `AlertCircle` imports
- Keep only the synthetic candle generation from trade prices and the chart rendering logic

The chart will always show synthetic candles derived from trade entry/exit prices with trade markers -- no external data source needed.

### Files
- **Delete**: `supabase/functions/market-data/index.ts`
- **Edit**: `src/components/dashboard/TradeChart.tsx`

