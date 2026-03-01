import { Trade, EquityPoint } from "@/types";
import Papa from "papaparse";
import { ParseResult } from "./index";

/**
 * Parses TradingView Strategy Tester CSV exports.
 * Expected columns: Trade #, Type, Signal, Date/Time, Price, Contracts, Profit, Cum. Profit, Run-up, Drawdown
 * TradingView exports entry and exit as separate rows sharing the same Trade #.
 */
export function parseTradingView(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });

  // Group rows by Trade #
  const tradeGroups: Record<string, any[]> = {};
  result.data.forEach((row: any) => {
    const tradeNum = row["Trade #"] || row["Trade#"] || row["trade_number"];
    if (!tradeNum) return;
    (tradeGroups[tradeNum] ??= []).push(row);
  });

  const trades: Trade[] = [];
  let runningEquity = 100000;
  const equityCurve: EquityPoint[] = [];

  Object.entries(tradeGroups).forEach(([tradeNum, rows], idx) => {
    try {
      // TradingView pairs: first row = entry, second row = exit
      const entryRow = rows[0];
      const exitRow = rows.length > 1 ? rows[1] : rows[0];

      const signal = (entryRow.Signal || entryRow.signal || entryRow.Type || "").toLowerCase();
      const direction: "long" | "short" = signal.includes("short") ? "short" : "long";

      const profit = parseFloat(exitRow.Profit || exitRow.profit || exitRow["P&L"] || "0");
      const cumProfit = parseFloat(exitRow["Cum. Profit"] || exitRow["Cumulative Profit"] || "0");

      const entryPrice = parseFloat(entryRow.Price || entryRow.price || "0");
      const exitPrice = parseFloat(exitRow.Price || exitRow.price || "0");
      const quantity = parseFloat(entryRow.Contracts || entryRow.contracts || entryRow.Shares || entryRow.shares || entryRow.Qty || "1");

      const entryTime = entryRow["Date/Time"] || entryRow["DateTime"] || entryRow["date_time"] || entryRow["Date"] || "";
      const exitTime = exitRow["Date/Time"] || exitRow["DateTime"] || exitRow["date_time"] || exitRow["Date"] || "";

      const trade: Trade = {
        id: `tv-${idx}`,
        strategyId,
        externalId: tradeNum,
        entryTime: normalizeDateTime(entryTime),
        exitTime: normalizeDateTime(exitTime),
        direction,
        entryPrice,
        exitPrice,
        quantity,
        pnlGross: profit,
        pnlNet: profit, // TradingView profit is typically net
        commission: 0,
        slippage: 0,
        instrument: entryRow.Symbol || entryRow.symbol || entryRow.Ticker || "UNKNOWN",
      };

      trades.push(trade);
      runningEquity += trade.pnlNet;
      const peak = Math.max(runningEquity, ...equityCurve.map((e) => e.equity), runningEquity);
      equityCurve.push({
        timestamp: trade.exitTime,
        equity: runningEquity,
        drawdown: (peak - runningEquity) / peak,
      });
    } catch {
      warnings.push(`Trade #${tradeNum}: parse error`);
    }
  });

  return { trades, equityCurve, format: "tradingview", warnings };
}

function normalizeDateTime(dt: string): string {
  if (!dt) return new Date().toISOString();
  // TradingView uses formats like "2025-01-02 10:00" — try parsing directly
  const d = new Date(dt);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}
