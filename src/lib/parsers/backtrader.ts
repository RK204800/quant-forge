import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";

export function parseBacktraderCSV(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  let runningEquity = 100000;
  let peak = runningEquity;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      const pnl = parseFloat(row.pnl || row.PnL || row.profit || row.Profit || "0");
      const trade: Trade = {
        id: `bt-${i}`,
        strategyId,
        entryTime: row.entry_date || row.EntryDate || row.date || new Date().toISOString(),
        exitTime: row.exit_date || row.ExitDate || row.date || new Date().toISOString(),
        direction: (row.direction || row.type || "long").toLowerCase().includes("short") ? "short" : "long",
        entryPrice: parseFloat(row.entry_price || row.EntryPrice || "0"),
        exitPrice: parseFloat(row.exit_price || row.ExitPrice || "0"),
        quantity: parseFloat(row.size || row.quantity || row.Quantity || "1"),
        pnlGross: pnl,
        pnlNet: pnl - parseFloat(row.commission || "0"),
        commission: parseFloat(row.commission || "0"),
        slippage: 0,
        instrument: row.ticker || row.symbol || row.Instrument || "UNKNOWN",
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

  return { trades, equityCurve, format: "backtrader", warnings };
}
