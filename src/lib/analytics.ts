import { Trade, StrategyMetrics, EquityPoint, MonthlyReturn } from "@/types";

const RISK_FREE_RATE = 0.04;
const TRADING_DAYS = 252;

export function calculateMetrics(trades: Trade[], equityCurve: EquityPoint[]): StrategyMetrics {
  if (!trades.length) return emptyMetrics();

  const pnls = trades.map((t) => t.pnlNet);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);

  const totalReturn = pnls.reduce((a, b) => a + b, 0);
  const winRate = wins.length / trades.length;
  const avgWin = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
  const avgLoss = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
  const profitFactor = losses.length ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0)) : Infinity;
  const expectancy = winRate * avgWin - (1 - winRate) * avgLoss;

  const dailyReturns = getDailyReturns(equityCurve);
  const annualizedReturn = dailyReturns.length ? (dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length) * TRADING_DAYS : 0;
  const volatility = stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS);
  const sharpeRatio = volatility ? (annualizedReturn - RISK_FREE_RATE) / volatility : 0;

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideDev = stdDev(downsideReturns) * Math.sqrt(TRADING_DAYS);
  const sortinoRatio = downsideDev ? (annualizedReturn - RISK_FREE_RATE) / downsideDev : 0;

  const maxDD = maxDrawdown(equityCurve);
  const calmarRatio = maxDD ? annualizedReturn / maxDD : 0;

  const holdingPeriods = trades.map((t) => {
    const entry = new Date(t.entryTime).getTime();
    const exit = new Date(t.exitTime).getTime();
    return (exit - entry) / (1000 * 60 * 60 * 24);
  });

  return {
    totalReturn,
    annualizedReturn: annualizedReturn * 100,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    maxDrawdown: maxDD * 100,
    maxDrawdownDuration: 0,
    winRate: winRate * 100,
    profitFactor,
    expectancy,
    totalTrades: trades.length,
    avgWin,
    avgLoss,
    bestTrade: Math.max(...pnls),
    worstTrade: Math.min(...pnls),
    avgHoldingPeriod: holdingPeriods.reduce((a, b) => a + b, 0) / holdingPeriods.length,
  };
}

export function getMonthlyReturns(equityCurve: EquityPoint[]): MonthlyReturn[] {
  if (equityCurve.length < 2) return [];
  const monthly: Record<string, { start: number; end: number; year: number; month: number }> = {};
  equityCurve.forEach((p) => {
    const d = new Date(p.timestamp);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    if (!monthly[key]) monthly[key] = { start: p.equity, end: p.equity, year: d.getFullYear(), month: d.getMonth() };
    monthly[key].end = p.equity;
  });
  return Object.values(monthly).map((m) => ({
    year: m.year,
    month: m.month,
    return: ((m.end - m.start) / m.start) * 100,
  }));
}

function getDailyReturns(curve: EquityPoint[]): number[] {
  if (curve.length < 2) return [];
  return curve.slice(1).map((p, i) => (p.equity - curve[i].equity) / curve[i].equity);
}

function maxDrawdown(curve: EquityPoint[]): number {
  let peak = -Infinity;
  let maxDD = 0;
  curve.forEach((p) => {
    if (p.equity > peak) peak = p.equity;
    const dd = (peak - p.equity) / peak;
    if (dd > maxDD) maxDD = dd;
  });
  return maxDD;
}

function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sq = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return Math.sqrt(sq / (arr.length - 1));
}

function emptyMetrics(): StrategyMetrics {
  return { totalReturn: 0, annualizedReturn: 0, sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0, winRate: 0, profitFactor: 0, expectancy: 0, totalTrades: 0, avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0, avgHoldingPeriod: 0 };
}
