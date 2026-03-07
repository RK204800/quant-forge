import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, findCol, computePnl } from "./utils";

export function parseNinjaTrader(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  const startingBalance = 0;
  let runningEquity = 0;
  let peak = 0;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      if (i === 0) {
        const firstDateRaw = String(findCol(row, "Entry time", "EntryTime", "entry_time", "Entry Date", "entry_date") ?? "");
        const firstTime = normalizeDateTime(firstDateRaw);
        if (firstTime) {
          equityCurve.push({ timestamp: firstTime, equity: startingBalance, drawdown: 0 });
        }
      }

      const pnl = safeFloat(findCol(row, "Profit", "profit", "Net profit", "Net P&L", "P&L", "pnl", "PnL", "Net pnl"));
      const commission = safeFloat(findCol(row, "Commission", "commission", "comm", "Comm"));

      const maeVal = findCol(row, "MAE", "mae", "Max Adverse Excursion", "Max. Adverse Excursion");
      const mfeVal = findCol(row, "MFE", "mfe", "Max Favorable Excursion", "Max. Favorable Excursion");

      const entryDateRaw = String(findCol(row, "Entry time", "EntryTime", "entry_time", "Entry Date", "entry_date", "Entry date") ?? "");
      const exitDateRaw = String(findCol(row, "Exit time", "ExitTime", "exit_time", "Exit Date", "exit_date", "Exit date") ?? "");

      const entryTime = normalizeDateTime(entryDateRaw);
      const exitTime = normalizeDateTime(exitDateRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Row ${i + 1}: unparseable date "${entryDateRaw}"`);
        return;
      }

      const dirRaw = String(findCol(row, "Market pos.", "Market pos", "Market position", "MarketPosition", "direction", "Direction", "side", "Side", "type", "Type") ?? "long");
      const direction: "long" | "short" = dirRaw.toLowerCase().includes("short") ? "short" : "long";
      const entryPrice = safeFloat(findCol(row, "Entry price", "EntryPrice", "entry_price", "Entry"));
      const exitPrice = safeFloat(findCol(row, "Exit price", "ExitPrice", "exit_price", "Exit"));
      const quantity = safeFloat(findCol(row, "Quantity", "quantity", "qty", "Qty", "size", "contracts", "Contracts", "# of contracts"), 1);
      const effectivePnl = pnl === 0 && entryPrice !== 0 && exitPrice !== 0
        ? computePnl(direction, entryPrice, exitPrice, quantity) : pnl;

      const trade: Trade = {
        id: `nt-${i}`,
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
        instrument: String(findCol(row, "Instrument", "instrument", "ticker", "symbol", "Symbol", "Ticker") ?? "UNKNOWN"),
        ...(maeVal !== undefined && maeVal !== null ? { mae: safeFloat(maeVal) } : {}),
        ...(mfeVal !== undefined && mfeVal !== null ? { mfe: safeFloat(mfeVal) } : {}),
      };
      trades.push(trade);
      runningEquity += trade.pnlNet;
      if (runningEquity > peak) peak = runningEquity;
      equityCurve.push({ timestamp: trade.exitTime, equity: runningEquity, drawdown: peak > 0 ? (peak - runningEquity) / peak : 0 });
    } catch {
      warnings.push(`Row ${i + 1}: parse error`);
    }
  });

  return { trades, equityCurve, format: "ninjatrader", warnings };
}
