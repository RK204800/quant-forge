import { Trade, EquityPoint } from "@/types";
import Papa from "papaparse";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, computePnl } from "./utils";

export function parseTradingView(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });

  const tradeGroups: Record<string, any[]> = {};
  result.data.forEach((row: any) => {
    const tradeNum = row["Trade #"] || row["Trade#"] || row["trade_number"];
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

      const entryDateRaw = entryRow["Date/Time"] || entryRow["DateTime"] || entryRow["date_time"] || entryRow["Date"] || "";
      const exitDateRaw = exitRow["Date/Time"] || exitRow["DateTime"] || exitRow["date_time"] || exitRow["Date"] || "";

      const entryTime = normalizeDateTime(entryDateRaw);
      const exitTime = normalizeDateTime(exitDateRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Trade #${tradeNum}: unparseable date "${entryDateRaw}"`);
        return;
      }

      // Insert initial equity point before first trade
      if (!initialPointAdded) {
        equityCurve.push({ timestamp: entryTime, equity: startingBalance, drawdown: 0 });
        initialPointAdded = true;
      }

      const typeField = (entryRow.Type || entryRow.type || "").toLowerCase();
      const signalField = (entryRow.Signal || entryRow.signal || "").toLowerCase();
      const combined = `${typeField} ${signalField}`;
      const direction: "long" | "short" = combined.includes("short") ? "short" : "long";

      const profit = safeFloat(exitRow.Profit || exitRow.profit || exitRow["P&L"]);
      const entryPrice = safeFloat(entryRow.Price || entryRow.price);
      const exitPrice = safeFloat(exitRow.Price || exitRow.price);
      const quantity = safeFloat(entryRow.Contracts || entryRow.contracts || entryRow.Shares || entryRow.shares || entryRow.Qty, 1);
      const effectivePnl = profit === 0 && entryPrice !== 0 && exitPrice !== 0
        ? computePnl(direction, entryPrice, exitPrice, quantity) : profit;

      // MAE/MFE columns
      const maeVal = exitRow.MAE || exitRow.mae;
      const mfeVal = exitRow.MFE || exitRow.mfe;

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
        instrument: entryRow.Symbol || entryRow.symbol || entryRow.Ticker || "UNKNOWN",
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
