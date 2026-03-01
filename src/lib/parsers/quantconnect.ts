import { Trade, EquityPoint } from "@/types";
import { ParseResult } from "./index";

export function parseQuantConnect(content: string, strategyId: string): ParseResult {
  const warnings: string[] = [];
  const trades: Trade[] = [];
  const equityCurve: EquityPoint[] = [];

  try {
    const data = JSON.parse(content);
    const orders = data.Orders || {};
    let runningEquity = 100000;

    Object.values(orders).forEach((order: any, i: number) => {
      if (order.Status !== "Filled" && order.Status !== 3) return;
      const pnl = parseFloat(order.Price || "0") * parseFloat(order.Quantity || "0") * 0.001; // simplified
      const trade: Trade = {
        id: `qc-${i}`,
        strategyId,
        entryTime: order.CreatedTime || order.Time || new Date().toISOString(),
        exitTime: order.LastFillTime || order.Time || new Date().toISOString(),
        direction: (order.Direction || "buy").toLowerCase().includes("sell") ? "short" : "long",
        entryPrice: parseFloat(order.Price || "0"),
        exitPrice: parseFloat(order.Price || "0"),
        quantity: Math.abs(parseFloat(order.Quantity || "0")),
        pnlGross: pnl,
        pnlNet: pnl,
        commission: 0,
        slippage: 0,
        instrument: order.Symbol?.Value || "UNKNOWN",
      };
      trades.push(trade);
      runningEquity += trade.pnlNet;
      const peak = Math.max(runningEquity, ...equityCurve.map((e) => e.equity), runningEquity);
      equityCurve.push({ timestamp: trade.exitTime, equity: runningEquity, drawdown: (peak - runningEquity) / peak });
    });
  } catch {
    warnings.push("Failed to parse QuantConnect JSON");
  }

  return { trades, equityCurve, format: "quantconnect", warnings };
}
