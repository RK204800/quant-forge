
Goal: make CSV/XLSX uploads reliably parse trade rows (including your HTF/NQ files) and stop the repeated “No trades found” failures.

What I found from investigation:
1) The NinjaTrader file you uploaded earlier now parses correctly (trades are being saved with correct PnL/date fields), so that specific fix is working.
2) The current failure pattern in session replay is different: both an XLSX and a CSV returned “No trades found.”
3) The current parser flow still assumes:
   - the first non-empty row is the true header row
   - XLSX trade data is on a sheet named “List of Trades” or “Trades” (otherwise it defaults to first sheet)
These assumptions are fragile for broker/platform exports that include intro/meta rows or different sheet names.

Likely root cause for the current issue:
- The uploaded HTF file format likely has either:
  - metadata rows above the actual trade table, and/or
  - a worksheet name not matching the hardcoded sheet-name preference.
When that happens, parser column matching never finds entry/exit/profit columns, every row gets skipped, and the UI only shows “No trades found.”

Implementation approach (to fix this robustly):
1) Add a shared CSV/XLSX pre-processing layer before parser-specific logic
   - Strip BOM and optional separator directive lines like `sep=,`.
   - Detect the real header row by scoring candidate rows for known trade columns (entry/exit time, price, qty, profit, trade number, etc.).
   - Trim content so parsing starts at the detected header row.
   - Keep delimiter auto-detection but normalize headers consistently.

2) Make XLSX extraction content-aware instead of name-only
   - In `xlsxToCSV`, scan all worksheets (or first N rows of each) and choose the sheet with the highest “trade-table header score”.
   - Export CSV starting from detected header row instead of raw row 1.
   - Keep current “List of Trades”/“Trades” preference as a fast path, but fall back to scoring when those names aren’t present.

3) Strengthen header normalization/matching across parsers
   - Extend normalization to ignore broad punctuation/symbol variants (not only spaces/underscores/dots), improving matches like:
     - `Market pos.`
     - `P/L` / `P&L`
     - `Entry Time (Local)` style headers.
   - Reuse one normalization rule for both `detectFormat` and `findCol` so format detection and field extraction behave consistently.

4) Add parser retry fallback for ambiguous files
   - If detected parser returns zero trades, try secondary parser candidates (NinjaTrader/Backtrader/TradingView) using the same preprocessed table.
   - Select the result with the highest valid trade count (and keep warnings for transparency).
   - Prevent bad false positives by requiring minimum-valid-column checks before accepting fallback parse.

5) Improve user-facing diagnostics in upload UI
   - Replace generic-only error with actionable details when parsing fails:
     - detected format
     - header row used
     - top warning(s), e.g. “Entry time column not found”
   - This will dramatically speed up future debugging and reduce blind retries.

6) Add regression tests to prevent this from coming back
   - New tests for:
     - CSV with metadata lines before header
     - CSV with `sep=,`
     - XLSX where trade data is not on first sheet / nonstandard sheet name
     - punctuation-heavy headers (`Market pos.`, `P/L`, etc.)
   - Keep existing NinjaTrader and TradingView behavior passing.

Files to update:
- `src/lib/parsers/utils.ts` (normalization + shared pre-processing helpers)
- `src/lib/parsers/index.ts` (format detection alignment + retry selection)
- `src/lib/parsers/ninjatrader.ts` (use enhanced preprocessing output if needed)
- `src/lib/parsers/backtrader.ts` (same)
- `src/lib/parsers/tradingview.ts` (same)
- `src/lib/parsers/xlsx-reader.ts` (sheet/header scoring and extraction)
- `src/components/upload/UploadZone.tsx` (better error/warning display)
- parser test files (new regression fixtures/tests)

Validation checklist after implementation:
1) Re-upload your failing HTF CSV file:
   - Confirm queue shows non-zero trades
   - Confirm format is sensible
   - Spot-check first few trades (entry/exit/pnl) against source file
2) Re-upload the matching XLSX:
   - Confirm same trade count (or explainable minor differences only)
3) Save and verify strategy metrics/equity look consistent with source report.
4) End-to-end verification in UI:
   - Upload → preview metrics/equity → save → strategy detail/trades table values match source.

Risk/edge cases and handling:
- Ambiguous files may match multiple formats: handled via valid-column gate + highest valid trade count strategy.
- Very large workbooks: cap row scanning window for sheet/header detection to keep upload responsive.
- Locale formats (decimal comma/thousands separator): keep current numeric normalization and extend only when clear safe patterns are detected.

If you approve, I’ll implement this parser hardening and then verify against your failing upload flow end-to-end.
