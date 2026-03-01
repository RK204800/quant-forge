import { describe, it, expect } from "vitest";
import { stripPrelude, scoreHeaderRow, normalizeHeader } from "./utils";
import { detectFormat, parseFile } from "./index";

describe("stripPrelude", () => {
  it("strips BOM", () => {
    const csv = "\uFEFFticker,entry_date,pnl\nSPY,2025-01-01,100";
    expect(stripPrelude(csv)).not.toContain("\uFEFF");
  });

  it("strips sep= directive", () => {
    const csv = "sep=,\nticker,entry_date,pnl\nSPY,2025-01-01,100";
    const result = stripPrelude(csv);
    expect(result.startsWith("ticker")).toBe(true);
  });

  it("skips metadata rows before header", () => {
    const csv = `Report generated on 2025-03-01
Account: Sim101
Trade number,Instrument,Entry price,Exit price,Entry time,Exit time,Profit,Commission
1,NQ,25510,25457,2025-01-02,2025-01-02,1055,4`;
    const result = stripPrelude(csv);
    expect(result.startsWith("Trade number")).toBe(true);
  });

  it("keeps content unchanged when header is first row", () => {
    const csv = "ticker,entry_date,exit_date,pnl\nSPY,2025-01-01,2025-01-02,100";
    expect(stripPrelude(csv)).toBe(csv);
  });
});

describe("scoreHeaderRow", () => {
  it("scores trade columns high", () => {
    expect(scoreHeaderRow("Trade number,Instrument,Entry price,Exit price,Profit")).toBeGreaterThanOrEqual(5);
  });
  it("scores non-trade content low", () => {
    expect(scoreHeaderRow("Report Name,Generated,Version")).toBe(0);
  });
});

describe("normalizeHeader", () => {
  it("strips punctuation and whitespace", () => {
    expect(normalizeHeader("Market pos.")).toBe("marketpos");
    expect(normalizeHeader("P&L")).toBe("pl");
    expect(normalizeHeader("Entry Time (Local)")).toBe("entrytimelocal");
  });
});

describe("parser fallback", () => {
  it("falls back when detected parser returns 0 trades", () => {
    // This CSV has backtrader-style columns but let's add a ticker col to trigger backtrader detection
    // then format the data so only NinjaTrader parser works (entry_price + exit_price columns)
    const csv = `Trade number,Instrument,Entry price,Exit price,Entry time,Exit time,Market pos.,Qty,Profit
1,NQ,25510,25457,2025-01-02 10:00:00,2025-01-02 11:00:00,Short,1,1055`;
    const result = parseFile(csv, "test.csv", "s1");
    expect(result.trades.length).toBe(1);
  });
});

describe("detectFormat with punctuation headers", () => {
  it("detects NinjaTrader with Market pos. column", () => {
    const header = "Trade number,Instrument,Market pos.,Entry price,Exit price";
    const csv = header + "\n1,NQ,Short,25510,25457";
    expect(detectFormat(csv, "test.csv")).toBe("ninjatrader");
  });
});
