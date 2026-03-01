

## Fix NinjaTrader CSV Parsing -- 4 Bugs Found

I compared your uploaded CSV against the parser code and found 4 distinct bugs that cause incorrect results.

### Your CSV Format
```
Trade number,Instrument,Account,Strategy,Market pos.,Qty,Entry price,Exit price,Entry time,Exit time,...,Profit,...,Commission,...,MAE,MFE,...
1,NQ 03-26,Sim101,Axios V1.5_JL,Short,1,25510.25,25457.25,02-Jan-26 10:54:00 AM,...,$1055.64,...,$4.36,...,$0.00,$1060.00,...
```

---

### Bug 1: Wrong parser selected (format detection)
The header has "Trade number" which matches the TradingView check (`tradenumber`) before NinjaTrader gets a chance. The NinjaTrader check looks for "marketposition" but your CSV has "Market pos." which normalizes to "marketpos." -- no match.

**Result**: Your file is parsed by the TradingView parser, which expects paired entry/exit rows and completely misinterprets the single-row-per-trade NinjaTrader format.

**Fix** (`src/lib/parsers/index.ts`): Reorder detection so NinjaTrader is checked first. Add "tradenumber" combined with "entryprice" as a NinjaTrader signature (TradingView uses "Trade #" and a single "Price" column, not "Entry price"/"Exit price").

### Bug 2: Dollar signs and accounting negatives in Profit/Commission/MAE/MFE
Values like `$1055.64` and `($109.36)` are not handled by `safeFloat`. `parseFloat("$1055.64")` returns NaN, so all profit values become 0.

**Fix** (`src/lib/parsers/utils.ts`): Strip `$`, commas, and convert `(value)` accounting notation to negative before parsing.

### Bug 3: Date format "02-Jan-26 10:54:00 AM" not parsed correctly
The format `DD-Mon-YY HH:mm:ss AM/PM` may parse the 2-digit year "26" as 1926 in some browsers, or fail entirely.

**Fix** (`src/lib/parsers/utils.ts`): Add explicit parsing for `DD-Mon-YY` and `DD-Mon-YYYY` formats with 12-hour AM/PM time.

### Bug 4: "Market pos." column not matched
`findCol` candidates include "Market position" but not "Market pos." After stripping spaces/underscores, "marketpos." still doesn't match "marketposition" due to the trailing period and abbreviation.

**Fix** (`src/lib/parsers/ninjatrader.ts`): Add "Market pos." and "Market pos" as candidates for the direction field.

---

### Changes Summary

**`src/lib/parsers/utils.ts`**
- `safeFloat`: Strip `$`, commas, and handle `(x.xx)` accounting negative format before parseFloat
- `normalizeDateTime`: Add DD-Mon-YY(YY) pattern with 12-hour AM/PM support (month abbreviations like Jan, Feb, etc.)

**`src/lib/parsers/index.ts`**
- Reorder format detection: check NinjaTrader before TradingView
- Use "tradenumber" + "entryprice" as a NinjaTrader signature (TradingView never has separate entry/exit price columns)

**`src/lib/parsers/ninjatrader.ts`**
- Add "Market pos.", "Market pos" as direction column candidates
- Add "Trade number" as a candidate for any trade-number field if needed

These fixes ensure your NQ futures CSV is correctly detected as NinjaTrader format, dates are parsed properly, and dollar-formatted profit values are read accurately.
