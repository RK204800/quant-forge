import { Trade, EquityPoint, FileFormat } from "@/types";
import { parseBacktraderCSV } from "./backtrader";
import { parseNinjaTrader } from "./ninjatrader";
import { parseQuantConnect } from "./quantconnect";

export interface ParseResult {
  trades: Trade[];
  equityCurve: EquityPoint[];
  format: FileFormat;
  warnings: string[];
}

export function detectFormat(content: string, fileName: string): FileFormat {
  if (fileName.endsWith(".json")) {
    try {
      const data = JSON.parse(content);
      if (data.Orders || data.TotalPerformance) return "quantconnect";
    } catch {}
  }
  const lines = content.split("\n").map((l) => l.trim()).filter(Boolean);
  if (lines[0]?.toLowerCase().includes("instrument") && lines[0]?.toLowerCase().includes("market position")) return "ninjatrader";
  if (lines[0]?.toLowerCase().includes("ref") || lines[0]?.toLowerCase().includes("ticker")) return "backtrader";
  return "generic";
}

export function parseFile(content: string, fileName: string, strategyId: string): ParseResult {
  const format = detectFormat(content, fileName);
  switch (format) {
    case "backtrader": return parseBacktraderCSV(content, strategyId);
    case "ninjatrader": return parseNinjaTrader(content, strategyId);
    case "quantconnect": return parseQuantConnect(content, strategyId);
    default: return parseBacktraderCSV(content, strategyId); // generic fallback
  }
}
