

## Fix TradingView Report Upload (XLSX + Robust CSV Parsing)

There are two separate issues preventing uploads:

### Problem 1: XLSX Files Not Supported
TradingView's recommended export ("Download data as XLSX") produces an Excel file with 5 sheets (including "List of Trades"). The app currently only accepts `.csv`, `.json`, and `.txt` files -- XLSX is silently rejected or read as garbled text.

### Problem 2: CSV Column Matching Too Rigid
The TradingView CSV parser and format detector rely on exact column name matches (`Trade #`, `Type`, `Signal`, etc.). Real TradingView exports can have slight variations in column names, extra whitespace, or BOM characters that cause the header check to fail. When detection fails, it falls back to the Backtrader parser which also can't parse the data, resulting in "No trades found."

---

### Changes

**1. Add `xlsx` (SheetJS) dependency**
- Install the `xlsx` package to parse Excel files in the browser.

**2. Create `src/lib/parsers/xlsx-reader.ts`**
- A utility that reads an `.xlsx` file's ArrayBuffer, finds the "List of Trades" sheet (or first sheet if not found), and converts it to CSV text using SheetJS's `utils.sheet_to_csv()`.
- Returns the CSV string so existing parsers can handle it.

**3. Update `src/components/upload/UploadZone.tsx`**
- Add `.xlsx,.xls` to the file input `accept` attribute.
- Before calling `parseFile`, check if the file name ends with `.xlsx` or `.xls`:
  - If so, read the file as an `ArrayBuffer` instead of text.
  - Pass it through the new XLSX reader to extract CSV from the "List of Trades" sheet.
  - Then feed that CSV into `parseFile` as normal.

**4. Update `src/lib/parsers/index.ts` -- More robust format detection**
- Normalize the header line: trim whitespace, remove BOM, lowercase.
- Use `includes` checks that are more forgiving of whitespace/punctuation variations.
- Add fallback: if no format is detected but the header contains trade-like columns (profit, price, date), try TradingView parser first, then Backtrader.

**5. Update `src/lib/parsers/tradingview.ts` -- Flexible column matching**
- Use the `findCol` utility (already in `utils.ts`) instead of direct `row["Trade #"]` lookups, to handle variations like `Trade#`, `Trade #`, `trade_number`, `Trade No`, etc.
- Also handle column name variations for Date/Time, Profit, Price, Contracts, Type, Signal.
- Add support for single-row-per-trade format (some TradingView exports have one row per trade with separate entry/exit columns rather than paired entry+exit rows).

### Technical Details

- SheetJS (`xlsx`) is a well-maintained, browser-compatible library (~200KB gzipped).
- The XLSX reader will iterate sheet names looking for a case-insensitive match on "list of trades" or "trades", falling back to the first sheet.
- For the CSV detection fix, the BOM character (`\uFEFF`) will be stripped from the start of content before header analysis.
- The `findCol` utility already handles case-insensitive fuzzy matching -- extending TradingView parser to use it ensures resilience to column name variations.
- No database or backend changes needed -- this is purely a client-side parsing improvement.

