import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime } from "./utils";

interface NautilusMetadata {
  strategy_name?: string;
  source_url?: string;
  timeframe?: string;
  asset_class?: string;
  backtest_engine?: string;
}

function extractMetadata(content: string): { metadata: NautilusMetadata | null; csvContent: string } {
  const lines = content.split(/\r?\n/);
  if (lines.length > 0 && lines[0].trimStart().startsWith("#")) {
    const jsonStr = lines[0].trimStart().slice(1).trim();
    try {
      const metadata = JSON.parse(jsonStr) as NautilusMetadata;
      return { metadata, csvContent: lines.slice(1).join("\n") };
    } catch {
      // Not valid JSON, treat as normal CSV
    }
  }
  return { metadata: null, csvContent: content };
}

export function parseNautilusTrader(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const { metadata, csvContent } = extractMetadata(content);

  const result = Papa.parse(csvContent, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  let runningEquity = 0;
  let peak = 0;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      const entryTimeRaw = String(row["entry_time"] ?? "");
      const exitTimeRaw = String(row["exit_time"] ?? "");
      const entryTime = normalizeDateTime(entryTimeRaw);
      const exitTime = normalizeDateTime(exitTimeRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Row ${i + 1}: unparseable entry_time "${entryTimeRaw}"`);
        return;
      }

      if (i === 0) {
        equityCurve.push({ timestamp: entryTime, equity: 0, drawdown: 0 });
      }

      const dirRaw = String(row["direction"] ?? "long");
      const direction: "long" | "short" = dirRaw.toLowerCase().includes("short") ? "short" : "long";

      const entryPrice = safeFloat(row["entry_price"]);
      const exitPrice = safeFloat(row["exit_price"]);
      const quantity = safeFloat(row["quantity"], 1);
      const pnlNet = safeFloat(row["pnl_net"]);
      const commission = safeFloat(row["commission"]);
      const instrument = String(row["instrument"] ?? "UNKNOWN");
      const mae = row["mae"] != null && row["mae"] !== "" ? safeFloat(row["mae"]) : undefined;
      const mfe = row["mfe"] != null && row["mfe"] !== "" ? safeFloat(row["mfe"]) : undefined;

      const trade: Trade = {
        id: `nt-${i}`,
        strategyId,
        entryTime,
        exitTime: exitTime || entryTime,
        direction,
        entryPrice,
        exitPrice,
        quantity,
        pnlGross: pnlNet + commission,
        pnlNet,
        commission,
        slippage: 0,
        instrument,
        ...(mae !== undefined ? { mae } : {}),
        ...(mfe !== undefined ? { mfe } : {}),
      };

      trades.push(trade);
      runningEquity += trade.pnlNet;
      if (runningEquity > peak) peak = runningEquity;
      equityCurve.push({
        timestamp: trade.exitTime,
        equity: runningEquity,
        drawdown: peak > 0 ? (peak - runningEquity) / peak : 0,
      });
    } catch {
      warnings.push(`Row ${i + 1}: parse error`);
    }
  });

  const parameters: Record<string, any> = {};
  if (metadata) {
    if (metadata.strategy_name) parameters.strategy_name = metadata.strategy_name;
    if (metadata.source_url) parameters.source_url = metadata.source_url;
    if (metadata.timeframe) parameters.timeframe = metadata.timeframe;
    if (metadata.asset_class) parameters.asset_class = metadata.asset_class;
    if (metadata.backtest_engine) parameters.backtest_engine = metadata.backtest_engine;
  }

  return {
    trades,
    equityCurve,
    format: "nautilustrader",
    warnings,
    ...(Object.keys(parameters).length > 0 ? { parameters } : {}),
  };
}
