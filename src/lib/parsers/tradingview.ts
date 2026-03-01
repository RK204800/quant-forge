import { Trade, EquityPoint } from "@/types";
import Papa from "papaparse";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, computePnl, findCol } from "./utils";

function col(row: Record<string, unknown>, ...names: string[]): string {
  const val = findCol(row, ...names);
  return val == null ? "" : String(val);
}

export function parseTradingView(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  // Strip BOM
  const clean = content.replace(/^\uFEFF/, "");
  const result = Papa.parse(clean, { header: true, skipEmptyLines: true });

  const tradeGroups: Record<string, any[]> = {};
  result.data.forEach((row: any) => {
    const tradeNum = col(row, "Trade #", "Trade#", "Trade No", "trade_number", "TradeNo");
    if (!tradeNum) return;
    (tradeGroups[tradeNum] ??= []).push(row);
  });

  const trades: Trade[] = [];
  const startingBalance = 0;
  let runningEquity = 0;
  let peak = 0;
  const equityCurve: EquityPoint[] = [];
  let initialPointAdded = false;

  Object.entries(tradeGroups).forEach(([tradeNum, rows], idx) => {
    try {
      const entryRow = rows[0];
      const exitRow = rows.length > 1 ? rows[1] : rows[0];

      const entryDateRaw = col(entryRow, "Date/Time", "DateTime", "date_time", "Date", "Entry Date", "EntryDate", "Entry Time");
      const exitDateRaw = col(exitRow, "Date/Time", "DateTime", "date_time", "Date", "Exit Date", "ExitDate", "Exit Time");

      const entryTime = normalizeDateTime(entryDateRaw);
      const exitTime = normalizeDateTime(exitDateRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Trade #${tradeNum}: unparseable date "${entryDateRaw}"`);
        return;
      }

      if (!initialPointAdded) {
        equityCurve.push({ timestamp: entryTime, equity: startingBalance, drawdown: 0 });
        initialPointAdded = true;
      }

      const typeField = col(entryRow, "Type", "type", "Side", "Action").toLowerCase();
      const signalField = col(entryRow, "Signal", "signal").toLowerCase();
      const combined = `${typeField} ${signalField}`;
      const direction: "long" | "short" = combined.includes("short") || combined.includes("sell") ? "short" : "long";

      const profit = safeFloat(findCol(exitRow, "Profit", "profit", "P&L", "PnL", "Net Profit", "NetProfit"));
      const entryPrice = safeFloat(findCol(entryRow, "Price", "price", "Entry Price", "EntryPrice"));
      const exitPrice = safeFloat(findCol(exitRow, "Price", "price", "Exit Price", "ExitPrice"));
      const quantity = safeFloat(findCol(entryRow, "Contracts", "contracts", "Shares", "shares", "Qty", "Quantity", "Size"), 1);
      const effectivePnl = profit === 0 && entryPrice !== 0 && exitPrice !== 0
        ? computePnl(direction, entryPrice, exitPrice, quantity) : profit;

      const maeVal = findCol(exitRow, "MAE", "mae", "Max Adverse Excursion");
      const mfeVal = findCol(exitRow, "MFE", "mfe", "Max Favorable Excursion");

      const trade: Trade = {
        id: `tv-${idx}`,
        strategyId,
        externalId: tradeNum,
        entryTime,
        exitTime: exitTime || entryTime,
        direction,
        entryPrice,
        exitPrice,
        quantity,
        pnlGross: effectivePnl,
        pnlNet: effectivePnl,
        commission: 0,
        slippage: 0,
        instrument: col(entryRow, "Symbol", "symbol", "Ticker", "Instrument") || "UNKNOWN",
        ...(maeVal !== undefined ? { mae: safeFloat(maeVal) } : {}),
        ...(mfeVal !== undefined ? { mfe: safeFloat(mfeVal) } : {}),
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
      warnings.push(`Trade #${tradeNum}: parse error`);
    }
  });

  return { trades, equityCurve, format: "tradingview", warnings };
}
