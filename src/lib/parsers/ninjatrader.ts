import Papa from "papaparse";
import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, computePnl } from "./utils";

export function parseNinjaTrader(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const result = Papa.parse(content, { header: true, skipEmptyLines: true });
  const trades: Trade[] = [];
  const startingBalance = 100000;
  let runningEquity = startingBalance;
  let peak = runningEquity;
  const equityCurve: EquityPoint[] = [];

  result.data.forEach((row: any, i: number) => {
    try {
      // Insert initial equity point before first trade
      if (i === 0) {
        const firstDateRaw = row["Entry time"] || row.EntryTime || "";
        const firstTime = normalizeDateTime(firstDateRaw);
        if (firstTime) {
          equityCurve.push({ timestamp: firstTime, equity: startingBalance, drawdown: 0 });
        }
      }

      const pnl = safeFloat(row.Profit || row.profit);
      const commission = safeFloat(row.Commission);

      // NinjaTrader natively exports MAE and MFE
      const maeVal = row.MAE || row.mae || row["Max Adverse Excursion"];
      const mfeVal = row.MFE || row.mfe || row["Max Favorable Excursion"];

      const entryDateRaw = row["Entry time"] || row.EntryTime || "";
      const exitDateRaw = row["Exit time"] || row.ExitTime || "";

      const entryTime = normalizeDateTime(entryDateRaw);
      const exitTime = normalizeDateTime(exitDateRaw) || entryTime;

      if (!entryTime) {
        warnings.push(`Row ${i + 1}: unparseable date "${entryDateRaw}"`);
        return;
      }

      const direction: "long" | "short" = (row["Market position"] || "long").toLowerCase().includes("short") ? "short" : "long";
      const entryPrice = safeFloat(row["Entry price"]);
      const exitPrice = safeFloat(row["Exit price"]);
      const quantity = safeFloat(row.Quantity, 1);
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
        instrument: row.Instrument || "UNKNOWN",
        ...(maeVal !== undefined ? { mae: safeFloat(maeVal) } : {}),
        ...(mfeVal !== undefined ? { mfe: safeFloat(mfeVal) } : {}),
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
