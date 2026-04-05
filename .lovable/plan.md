

## Add NautilusTrader CSV Parser

### Overview
Add a dedicated parser for NautilusTrader CSV exports with optional JSON metadata header, and wire it into the existing detection/parsing pipeline.

### Detection Logic
In `detectFormat()`, add a check **before** the NinjaTrader block: if normalized header columns contain all three of `pnlnet`, `mae`, `mfe` → return `"nautilustrader"`.

### Files to Create

**`src/lib/parsers/nautilustrader.ts`**
- Extract optional JSON metadata from first line if it starts with `#` — parse `{"strategy_name", "source_url", "timeframe", "asset_class", "backtest_engine"}` and attach to `ParseResult.parameters`
- If metadata line exists, skip it before CSV parsing (use PapaParse with `header: true`)
- Map columns directly: `entry_time`, `exit_time`, `direction`, `entry_price`, `exit_price`, `quantity`, `pnl_net`, `commission`, `instrument`, `mae`, `mfe`
- Build equity curve from running PnL sum
- Follow the same pattern as `backtrader.ts`

### Files to Modify

**`src/types/index.ts`**
- Add `"nautilustrader"` to the `FileFormat` union type

**`src/lib/parsers/index.ts`**
- Import `parseNautilusTrader` from `./nautilustrader`
- Add detection rule in `detectFormat()` for `pnlnet` + `mae` + `mfe`
- Add `["nautilustrader", parseNautilusTrader]` to the `PARSERS` fallback array
- Add case in `parseFile()` switch

**`src/pages/UploadStrategy.tsx`**
- When building the save payload (line ~132), spread any `result.parameters` metadata (strategy name, timeframe, assetClass, backtestEngine) into the `saveStrategy.mutate()` call so parsed metadata auto-populates the strategy record

**`src/components/upload/UploadZone.tsx`**
- Pass metadata through in the `ParsedFile` result (already works — no change needed since `ParseResult.parameters` flows through)

### Metadata Auto-Population
The `ParseResult.parameters` field will carry the NautilusTrader metadata. In `UploadStrategy.tsx`, when saving, if `result.parameters?.backtest_engine` exists, pass it as `backtestEngine`; same for `timeframe`, `assetClass`, and use `strategy_name` as the default queue item name.

### No DB Changes Needed
The existing `backtest_engine` column on `strategies` table already accepts any string value.

