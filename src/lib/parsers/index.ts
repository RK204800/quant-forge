import { Trade, EquityPoint, FileFormat } from "@/types";
import { parseBacktraderCSV } from "./backtrader";
import { parseNinjaTrader } from "./ninjatrader";
import { parseQuantConnect } from "./quantconnect";
import { parseTradingView } from "./tradingview";
import { normalizeHeader, stripPrelude, detectDelimiter } from "./utils";

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

  const clean = content.replace(/^\uFEFF/, "");
  const lines = clean.split("\n").map((l) => l.trim()).filter(Boolean);
  const rawHeader = lines[0] ?? "";
  const delimiter = detectDelimiter(rawHeader);
  const headerCols = rawHeader.split(delimiter).map((c) => normalizeHeader(c.replace(/^"|"$/g, "")));
  const header = headerCols.join("");

  // NinjaTrader: has separate entry/exit price columns or marketpos
  if (headerCols.includes("instrument") && (headerCols.some(c => c.startsWith("marketpos")) || headerCols.includes("marketposition"))) return "ninjatrader";
  if ((headerCols.includes("tradenumber") || headerCols.includes("tradeno") || headerCols.includes("trade")) && headerCols.includes("entryprice")) return "ninjatrader";

  // TradingView: "Trade #" with single Price column and paired entry/exit rows
  if (header.includes("trade") && header.includes("signal")) return "tradingview";

  // Backtrader / generic
  if (headerCols.includes("ref") || headerCols.includes("ticker")) return "backtrader";

  // Fallback heuristics
  if (headerCols.includes("entryprice") || headerCols.includes("exitprice")) return "ninjatrader";
  if (header.includes("profit") && header.includes("price")) return "tradingview";

  return "generic";
}

type ParserFn = (content: string, strategyId: string) => ParseResult;

const PARSERS: [FileFormat, ParserFn][] = [
  ["ninjatrader", parseNinjaTrader],
  ["backtrader", parseBacktraderCSV],
  ["tradingview", parseTradingView],
];

export function extractHeaders(content: string): { headers: string[]; sampleRows: Record<string, string>[] } {
  const clean = content.replace(/^\uFEFF/, "").replace(/^sep=.\r?\n/i, "");
  const lines = clean.split(/\r?\n/).filter(Boolean);
  if (lines.length === 0) return { headers: [], sampleRows: [] };

  // Use papa-style split for first line as headers
  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));
  const sampleRows: Record<string, string>[] = [];
  for (let i = 1; i <= Math.min(3, lines.length - 1); i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    sampleRows.push(row);
  }
  return { headers, sampleRows };
}

export function parseFile(content: string, fileName: string, strategyId: string): ParseResult {
  // Pre-process: strip BOM, sep= directives, metadata rows
  const preprocessed = fileName.endsWith(".json") ? content : stripPrelude(content);

  const format = detectFormat(preprocessed, fileName);

  // Try detected format first
  let result: ParseResult;
  switch (format) {
    case "quantconnect":
      return parseQuantConnect(preprocessed, strategyId);
    case "ninjatrader":
      result = parseNinjaTrader(preprocessed, strategyId);
      break;
    case "tradingview":
      result = parseTradingView(preprocessed, strategyId);
      break;
    case "backtrader":
    default:
      result = parseBacktraderCSV(preprocessed, strategyId);
      break;
  }

  // If detected parser found trades, return
  if (result.trades.length > 0) return result;

  // Fallback: try all parsers, pick the one with most trades
  let bestResult = result;
  for (const [fmt, parser] of PARSERS) {
    if (fmt === format) continue; // already tried
    try {
      const alt = parser(preprocessed, strategyId);
      if (alt.trades.length > bestResult.trades.length) {
        bestResult = alt;
        bestResult.warnings.unshift(`Auto-detected as "${fmt}" (fallback from "${format}")`);
      }
    } catch { /* skip */ }
  }

  return bestResult;
}
