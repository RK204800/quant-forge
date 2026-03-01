import { Trade, EquityPoint, FileFormat } from "@/types";
import { parseBacktraderCSV } from "./backtrader";
import { parseNinjaTrader } from "./ninjatrader";
import { parseQuantConnect } from "./quantconnect";
import { parseTradingView } from "./tradingview";

export interface ParseResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  format: FileFormat;
  warnings: string[];
  parameters?: Record<string, any>;
}

export function detectFormat(content: string, fileName: string): FileFormat {
  if (fileName.endsWith(".json")) {
    try {
      const data = JSON.parse(content);
      if (data.Orders || data.TotalPerformance) return "quantconnect";
    } catch {}
  }
  // Strip BOM and normalize
  const clean = content.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const header = (lines[0] ?? "").toLowerCase().replace(/[_\s]+/g, "");

  if (header.includes("instrument") && header.includes("marketposition")) return "ninjatrader";
  if (header.includes("trade#") || header.includes("tradeno") || header.includes("tradenumber")) return "tradingview";
  if (header.includes("ref") || header.includes("ticker")) return "backtrader";

  // Fallback: if header has trade-like columns, try tradingview
  if (header.includes("profit") && header.includes("price")) return "tradingview";

  return "generic";
}

export function parseFile(content: string, fileName: string, strategyId: string): ParseResult {
  const format = detectFormat(content, fileName);
  switch (format) {
    case "backtrader": return parseBacktraderCSV(content, strategyId);
    case "ninjatrader": return parseNinjaTrader(content, strategyId);
    case "quantconnect": return parseQuantConnect(content, strategyId);
    case "tradingview": return parseTradingView(content, strategyId);
    default: return parseBacktraderCSV(content, strategyId); // generic fallback
  }
}
