import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, computePnl } from "./utils";

export function parseQuantConnect(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  try {
    const data = JSON.parse(content);
    const orders = data.Orders || {};
    const startingBalance = 0;
    let runningEquity = 0;
    let peak = 0;
    let initialPointAdded = false;

    Object.values(orders).forEach((order: any, i: number) => {
      if (order.Status !== "Filled" && order.Status !== 3) return;

      const entryTime = normalizeDateTime(order.CreatedTime || order.Time || "");
      const exitTime = normalizeDateTime(order.LastFillTime || order.Time || "") || entryTime;

      if (!entryTime) {
        warnings.push(`Order ${i + 1}: unparseable date`);
        return;
      }

      // Insert initial equity point before first trade
      if (!initialPointAdded) {
        equityCurve.push({ timestamp: entryTime, equity: startingBalance, drawdown: 0 });
        initialPointAdded = true;
      }

      const price = safeFloat(order.Price);
      const qty = Math.abs(safeFloat(order.Quantity));
      const direction: "long" | "short" = (order.Direction || "buy").toLowerCase().includes("sell") ? "short" : "long";
      const lastFillPrice = safeFloat(order.LastFillPrice || order.Price);
      const pnl = computePnl(direction, price, lastFillPrice, qty);

      const trade: Trade = {
        id: `qc-${i}`,
        strategyId,
        entryTime,
        exitTime: exitTime || entryTime,
        direction,
        entryPrice: price,
        exitPrice: lastFillPrice,
        quantity: qty,
        pnlGross: pnl,
        pnlNet: pnl,
        commission: 0,
        slippage: 0,
        instrument: order.Symbol?.Value || "UNKNOWN",
      };
      trades.push(trade);
      runningEquity += trade.pnlNet;
      if (runningEquity > peak) peak = runningEquity;
      equityCurve.push({ timestamp: trade.exitTime, equity: runningEquity, drawdown: peak > 0 ? (peak - runningEquity) / peak : 0 });
    });
  } catch {
    warnings.push("Failed to parse QuantConnect JSON");
  }

  return { trades, equityCurve, format: "quantconnect", warnings };
}
