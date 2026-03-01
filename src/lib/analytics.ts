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

  // Resample equity curve to calendar days for proper daily returns
  const dailyReturns = getResampledDailyReturns(equityCurve);

  // CAGR-style annualized return
  const annualizedReturn = computeAnnualizedReturn(equityCurve);

  const volatility = dailyReturns.length >= 2 ? stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS) : 0;
  const sharpeRatio = volatility ? (annualizedReturn - RISK_FREE_RATE) / volatility : 0;

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideDev = downsideReturns.length >= 2 ? stdDev(downsideReturns) * Math.sqrt(TRADING_DAYS) : 0;
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

/**
 * Resample equity curve to calendar-day intervals via forward-fill,
 * then compute daily returns from consecutive days.
 */
function getResampledDailyReturns(curve: EquityPoint[]): number[] {
  if (curve.length < 2) return [];

  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

  // Build a map of date -> equity (last value wins if multiple trades on same day)
  const equityByDate = new Map<string, number>();
  sorted.forEach((p) => {
    const dateKey = new Date(p.timestamp).toISOString().slice(0, 10);
    equityByDate.set(dateKey, p.equity);
  });

  // Generate all calendar days between first and last
  const firstDate = new Date(sorted[0].timestamp);
  const lastDate = new Date(sorted[sorted.length - 1].timestamp);
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);

  const dailyEquities: number[] = [];
  let lastKnownEquity = sorted[0].equity;
  const current = new Date(firstDate);

  while (current <= lastDate) {
    const key = current.toISOString().slice(0, 10);
    if (equityByDate.has(key)) {
      lastKnownEquity = equityByDate.get(key)!;
    }
    dailyEquities.push(lastKnownEquity);
    current.setDate(current.getDate() + 1);
  }

  // Compute returns between consecutive days
  const returns: number[] = [];
  for (let i = 1; i < dailyEquities.length; i++) {
    if (dailyEquities[i - 1] !== 0) {
      returns.push((dailyEquities[i] - dailyEquities[i - 1]) / dailyEquities[i - 1]);
    }
  }
  return returns;
}

/**
 * CAGR-style annualized return: (endEquity / startEquity)^(365/totalDays) - 1
 */
function computeAnnualizedReturn(curve: EquityPoint[]): number {
  if (curve.length < 2) return 0;

  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const startEquity = sorted[0].equity;
  const endEquity = sorted[sorted.length - 1].equity;

  if (startEquity <= 0 || endEquity <= 0) return 0;

  const startMs = new Date(sorted[0].timestamp).getTime();
  const endMs = new Date(sorted[sorted.length - 1].timestamp).getTime();
  const totalDays = (endMs - startMs) / (1000 * 60 * 60 * 24);

  if (totalDays < 1) return 0;

  const totalReturn = endEquity / startEquity;
  return Math.pow(totalReturn, 365 / totalDays) - 1;
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

function maxDrawdown(curve: EquityPoint[]): number {
  if (curve.length < 1) return 0;
  let peak = 0;
  let maxDD = 0;
  curve.forEach((p) => {
    if (p.equity > peak) peak = p.equity;
    if (peak > 0) {
      const dd = (peak - p.equity) / peak;
      if (dd > maxDD) maxDD = dd;
    }
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
