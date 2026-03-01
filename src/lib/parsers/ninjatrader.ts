import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";

export function parseNinjaTrader(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  let runningEquity = 100000;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      const pnl = parseFloat(row.Profit || row.profit || "0");
      const trade: Trade = {
        id: `nt-${i}`,
        strategyId,
        entryTime: row["Entry time"] || row.EntryTime || new Date().toISOString(),
        exitTime: row["Exit time"] || row.ExitTime || new Date().toISOString(),
        direction: (row["Market position"] || "long").toLowerCase().includes("short") ? "short" : "long",
        entryPrice: parseFloat(row["Entry price"] || "0"),
        exitPrice: parseFloat(row["Exit price"] || "0"),
        quantity: parseFloat(row.Quantity || "1"),
        pnlGross: pnl,
        pnlNet: pnl - parseFloat(row.Commission || "0"),
        commission: parseFloat(row.Commission || "0"),
        slippage: 0,
        instrument: row.Instrument || "UNKNOWN",
      };
      trades.push(trade);
      runningEquity += trade.pnlNet;
      const peak = Math.max(runningEquity, ...equityCurve.map((e) => e.equity), runningEquity);
      equityCurve.push({ timestamp: trade.exitTime, equity: runningEquity, drawdown: (peak - runningEquity) / peak });
    } catch {
      warnings.push(`Row ${i + 1}: parse error`);
    }
  });

  return { trades, equityCurve, format: "ninjatrader", warnings };
}
