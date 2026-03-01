import { Strategy, Trade, EquityPoint } from "@/types";

function generateTrades(strategyId: string, count: number, startDate: Date, instrument: string): Trade[] {
  const trades: Trade[] = [];
  let date = new Date(startDate);
  for (let i = 0; i < count; i++) {
    const direction = Math.random() > 0.5 ? "long" : "short" as const;
    const entryPrice = 100 + Math.random() * 400;
    const pnlPercent = (Math.random() - 0.42) * 0.08;
    const exitPrice = entryPrice * (1 + (direction === "long" ? pnlPercent : -pnlPercent));
    const quantity = Math.floor(Math.random() * 100) + 10;
    const pnlGross = (exitPrice - entryPrice) * quantity * (direction === "long" ? 1 : -1);
    const commission = quantity * 0.005;
    date = new Date(date.getTime() + (Math.random() * 3 + 0.5) * 86400000);
    const exitDate = new Date(date.getTime() + (Math.random() * 5 + 0.5) * 86400000);

    trades.push({
      id: `${strategyId}-t${i}`,
      strategyId,
      entryTime: date.toISOString(),
      exitTime: exitDate.toISOString(),
      direction,
      entryPrice: +entryPrice.toFixed(2),
      exitPrice: +exitPrice.toFixed(2),
      quantity,
      pnlGross: +pnlGross.toFixed(2),
      pnlNet: +(pnlGross - commission).toFixed(2),
      commission: +commission.toFixed(2),
      slippage: +(Math.random() * 0.5).toFixed(2),
      instrument,
    });
    date = exitDate;
  }
  return trades;
}

function generateEquityCurve(trades: Trade[], initialCapital: number): EquityPoint[] {
  let equity = initialCapital;
  let peak = equity;
  const curve: EquityPoint[] = [{ timestamp: trades[0]?.entryTime || new Date().toISOString(), equity, drawdown: 0 }];
  trades.forEach((t) => {
    equity += t.pnlNet;
    if (equity > peak) peak = equity;
    curve.push({ timestamp: t.exitTime, equity: +equity.toFixed(2), drawdown: +((peak - equity) / peak).toFixed(4) });
  });
  return curve;
}

const momentumTrades = generateTrades("s1", 180, new Date("2024-01-15"), "SPY");
const meanRevTrades = generateTrades("s2", 240, new Date("2024-02-01"), "QQQ");
const breakoutTrades = generateTrades("s3", 120, new Date("2024-03-10"), "AAPL");

export const mockStrategies: Strategy[] = [
  {
    id: "s1",
    name: "Momentum Alpha",
    description: "Trend-following momentum strategy on S&P 500 ETFs with ATR-based stops",
    assetClass: "Equities",
    timeframe: "Daily",
    broker: "Interactive Brokers",
    backtestEngine: "Backtrader",
    status: "active",
    createdAt: "2024-01-15T00:00:00Z",
    updatedAt: "2025-02-28T00:00:00Z",
    trades: momentumTrades,
    equityCurve: generateEquityCurve(momentumTrades, 100000),
  },
  {
    id: "s2",
    name: "Mean Reversion QQQ",
    description: "Statistical arbitrage mean-reversion on NASDAQ ETFs using Bollinger Bands",
    assetClass: "Equities",
    timeframe: "4H",
    broker: "Alpaca",
    backtestEngine: "QuantConnect",
    status: "active",
    createdAt: "2024-02-01T00:00:00Z",
    updatedAt: "2025-02-28T00:00:00Z",
    trades: meanRevTrades,
    equityCurve: generateEquityCurve(meanRevTrades, 50000),
  },
  {
    id: "s3",
    name: "Breakout Scanner",
    description: "Volatility breakout strategy on AAPL with volume confirmation",
    assetClass: "Equities",
    timeframe: "1H",
    broker: "NinjaTrader",
    backtestEngine: "NinjaTrader",
    status: "paused",
    createdAt: "2024-03-10T00:00:00Z",
    updatedAt: "2025-02-15T00:00:00Z",
    trades: breakoutTrades,
    equityCurve: generateEquityCurve(breakoutTrades, 75000),
  },
];
