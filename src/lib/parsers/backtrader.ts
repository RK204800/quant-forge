import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, findCol, computePnl } from "./utils";

export function parseBacktraderCSV(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  let runningEquity = 100000;
  let peak = runningEquity;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      const pnl = safeFloat(findCol(row, "pnl", "PnL", "profit", "Profit", "P&L", "P/L", "net_profit", "Net P&L"));
      const commission = safeFloat(findCol(row, "commission", "Commission", "comm"));

      const entryDateRaw = String(findCol(row, "entry_date", "EntryDate", "date", "Date", "open_time", "datetime", "DateTime", "entry_time", "EntryTime") ?? "");
      const exitDateRaw = String(findCol(row, "exit_date", "ExitDate", "close_date", "exit_time", "ExitTime", "close_time") ?? "");

      const entryTime = normalizeDateTime(entryDateRaw);
      const exitTime = normalizeDateTime(exitDateRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Row ${i + 1}: unparseable date "${entryDateRaw}"`);
        return;
      }

      const dirRaw = String(findCol(row, "direction", "type", "side", "Direction", "Type", "Side") ?? "long");
      const direction: "long" | "short" = dirRaw.toLowerCase().includes("short") ? "short" : "long";
      const entryPrice = safeFloat(findCol(row, "entry_price", "EntryPrice", "Open", "open_price", "Entry"));
      const exitPrice = safeFloat(findCol(row, "exit_price", "ExitPrice", "Close", "close_price", "Exit"));
      const quantity = safeFloat(findCol(row, "size", "quantity", "Quantity", "qty", "Qty", "contracts", "Contracts", "volume"), 1);
      const effectivePnl = pnl === 0 && entryPrice !== 0 && exitPrice !== 0
        ? computePnl(direction, entryPrice, exitPrice, quantity) : pnl;

      const trade: Trade = {
        id: `bt-${i}`,
        strategyId,
        entryTime,
        exitTime: exitTime || entryTime,
        direction,
        entryPrice,
        exitPrice,
        quantity,
        pnlGross: effectivePnl,
        pnlNet: effectivePnl - commission,
        commission,
        slippage: 0,
        instrument: String(findCol(row, "ticker", "symbol", "Instrument", "Symbol", "Ticker", "instrument") ?? "UNKNOWN"),
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
