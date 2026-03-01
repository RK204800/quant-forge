import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime } from "./utils";

export function parseQuantConnect(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  try {
    const data = JSON.parse(content);
    const orders = data.Orders || {};
    let runningEquity = 100000;
    let peak = runningEquity;

    Object.values(orders).forEach((order: any, i: number) => {
      if (order.Status !== "Filled" && order.Status !== 3) return;
      const price = safeFloat(order.Price);
      const qty = Math.abs(safeFloat(order.Quantity));
      const pnl = price * qty * 0.001; // simplified

      const entryTime = normalizeDateTime(order.CreatedTime || order.Time || "");
      const exitTime = normalizeDateTime(order.LastFillTime || order.Time || "") || entryTime;

      if (!entryTime) {
        warnings.push(`Order ${i + 1}: unparseable date`);
        return;
      }

      const trade: Trade = {
        id: `qc-${i}`,
        strategyId,
        entryTime,
        exitTime: exitTime || entryTime,
        direction: (order.Direction || "buy").toLowerCase().includes("sell") ? "short" : "long",
        entryPrice: price,
        exitPrice: price,
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
