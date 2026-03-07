

## Fix: NinjaTrader Upload Not Showing Trade Data

### Root Cause Analysis

Two parsing issues prevent NinjaTrader CSV files from being processed correctly:

1. **`stripPrelude` only splits by comma** -- NinjaTrader often exports with semicolons or tabs as delimiters. When the file has metadata rows above the header (report name, account info), `scoreHeaderRow` splits by comma, scores every line at 0, and leaves metadata rows in place. Papa.parse then uses the metadata row as the header, causing all column lookups to fail silently.

2. **`normalizeDateTime` doesn't handle AM/PM with numeric dates** -- NinjaTrader exports dates like `"2/7/2026 6:58:00 PM"`. The US-date regex captures hour/minute/second but ignores the AM/PM suffix, producing wrong timestamps (6 PM becomes 6 AM). While native `Date()` might handle some cases, the regex match runs first for `MM/DD/YYYY` formats and produces a valid-but-wrong date.

### Changes

#### 1. `src/lib/parsers/utils.ts` -- Fix `scoreHeaderRow` and `normalizeDateTime`

**`scoreHeaderRow`**: Auto-detect delimiter (comma, semicolon, tab) before splitting. Split on whichever delimiter produces the most columns, then score each column against trade tokens.

**`normalizeDateTime`**: Add AM/PM capture group to the US-date and EU-date regex patterns. Adjust hour accordingly when PM is detected.

#### 2. `src/lib/parsers/ninjatrader.ts` -- Add more NinjaTrader header variants

Add additional column name candidates that NinjaTrader uses across versions:
- "Trade #", "Trade number" for trade identifiers
- "# of contracts" for quantity
- "Entry name", "Exit name" for signal names

#### 3. `src/lib/parsers/index.ts` -- Improve format detection for non-comma files

Update `detectFormat` to handle the case where `normalizeHeader` on the entire first line (including semicolons/tabs stripped) still works, but add an explicit split-by-detected-delimiter path for more reliable matching.

### Technical Details

**Delimiter detection for `scoreHeaderRow`:**
```text
function detectDelimiter(line: string): string {
  // Count occurrences of each candidate delimiter
  // Return the one with highest count among: tab, semicolon, comma
}
```

**AM/PM fix for `normalizeDateTime`:**
```text
// Current regex: /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
// Fixed regex:   /^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})(?:\s+(\d{1,2}):(\d{2})(?::(\d{2}))?\s*(AM|PM)?)?/i
// Then adjust hour for PM
```

### Files to Modify
- `src/lib/parsers/utils.ts` -- Fix delimiter detection and AM/PM handling
- `src/lib/parsers/ninjatrader.ts` -- Add header variants
- `src/lib/parsers/index.ts` -- Improve detectFormat for multi-delimiter files

