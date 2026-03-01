import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, findCol, computePnl } from "./utils";

export function parseBacktraderCSV(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  const startingBalance = 0;
  let runningEquity = 0;
  let peak = 0;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      // Insert initial equity point before first trade
      if (i === 0) {
        const firstDateRaw = String(findCol(row, "entry_date", "EntryDate", "date", "Date", "open_time", "datetime", "DateTime", "entry_time", "EntryTime") ?? "");
        const firstTime = normalizeDateTime(firstDateRaw);
        if (firstTime) {
          equityCurve.push({ timestamp: firstTime, equity: startingBalance, drawdown: 0 });
        }
      }

      const pnl = safeFloat(findCol(row, "pnl", "PnL", "profit", "Profit", "P&L", "P/L", "net_profit", "Net P&L"));
      const commission = safeFloat(findCol(row, "commission", "Commission", "comm"));
      const mae = findCol(row, "mae", "MAE", "Max Adverse Excursion");
      const mfe = findCol(row, "mfe", "MFE", "Max Favorable Excursion");

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
        ...(mae !== undefined && mae !== null ? { mae: safeFloat(mae) } : {}),
        ...(mfe !== undefined && mfe !== null ? { mfe: safeFloat(mfe) } : {}),
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
