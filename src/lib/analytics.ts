import { Trade, StrategyMetrics, ExtendedMetrics, EquityPoint, MonthlyReturn } from "@/types";
import { getESTHour, getESTMinutes, getESTDayOfWeek, getESTDateKey, getESTYearMonth, formatEST } from "@/lib/timezone";

const RISK_FREE_RATE = 0.04;
const TRADING_DAYS = 252;
const TRADING_DAYS_PER_MONTH = 22;

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

  const dailyReturns = getResampledDailyReturns(equityCurve);
  const annualizedReturn = computeAnnualizedReturn(equityCurve);

  // Dollar-based Sharpe: mean daily PnL / stddev of daily PnL, annualized
  const meanDailyPnl = dailyReturns.length ? dailyReturns.reduce((a, b) => a + b, 0) / dailyReturns.length : 0;
  const volatility = dailyReturns.length >= 2 ? stdDev(dailyReturns) * Math.sqrt(TRADING_DAYS) : 0;
  const annualizedMeanPnl = meanDailyPnl * TRADING_DAYS;
  const sharpeRatio = volatility ? annualizedMeanPnl / volatility : 0;

  const downsideReturns = dailyReturns.filter((r) => r < 0);
  const downsideDev = downsideReturns.length >= 2 ? stdDev(downsideReturns) * Math.sqrt(TRADING_DAYS) : 0;
  const sortinoRatio = downsideDev ? annualizedMeanPnl / downsideDev : 0;

  const maxDD = maxDrawdown(equityCurve);
  const calmarRatio = maxDD ? annualizedReturn / maxDD : 0;

  const holdingPeriods = trades.map((t) => {
    const entry = new Date(t.entryTime).getTime();
    const exit = new Date(t.exitTime).getTime();
    return (exit - entry) / (1000 * 60 * 60 * 24);
  });

  return {
    totalReturn,
    annualizedReturn,
    sharpeRatio,
    sortinoRatio,
    calmarRatio,
    maxDrawdown: maxDD,
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

export function calculateExtendedMetrics(trades: Trade[], equityCurve: EquityPoint[]): ExtendedMetrics {
  const base = calculateMetrics(trades, equityCurve);
  if (!trades.length) return { ...base, ...emptyExtended() };

  const pnls = trades.map((t) => t.pnlNet);
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const even = pnls.filter((p) => p === 0);

  const grossProfit = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const totalCommission = trades.reduce((a, t) => a + t.commission, 0);

  // Consecutive streaks
  const { maxConsecWins, maxConsecLosses } = computeStreaks(pnls);

  // Unique trading days
  const uniqueDays = new Set(trades.map((t) => new Date(t.exitTime).toISOString().slice(0, 10)));
  const totalTradingDays = uniqueDays.size || 1;
  const avgTradesPerDay = trades.length / totalTradingDays;

  // Profit per month based on 22 trading days
  const totalNetProfit = pnls.reduce((a, b) => a + b, 0);
  const tradingMonths = totalTradingDays / TRADING_DAYS_PER_MONTH;
  const profitPerMonth = tradingMonths > 0 ? totalNetProfit / tradingMonths : 0;

  // Max recovery time
  const maxRecoveryDays = computeMaxRecoveryDays(equityCurve);

  // Start/end dates
  const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
  const startDate = sortedTrades[0]?.entryTime || "";
  const endDate = sortedTrades[sortedTrades.length - 1]?.exitTime || "";

  const avgWinVal = base.avgWin;
  const avgLossVal = base.avgLoss;
  const avgWinLossRatio = avgLossVal > 0 ? avgWinVal / avgLossVal : Infinity;

  return {
    ...base,
    grossProfit,
    grossLoss,
    totalCommission,
    maxConsecWins,
    maxConsecLosses,
    avgTradesPerDay,
    profitPerMonth,
    maxRecoveryDays,
    startDate,
    endDate,
    winningTrades: wins.length,
    losingTrades: losses.length,
    evenTrades: even.length,
    avgWinLossRatio,
  };
}

export function calculateMetricsByDirection(trades: Trade[], equityCurve: EquityPoint[]) {
  const longTrades = trades.filter((t) => t.direction === "long");
  const shortTrades = trades.filter((t) => t.direction === "short");

  // Build sub-equity curves for direction subsets
  const buildSubCurve = (subset: Trade[]): EquityPoint[] => {
    if (!subset.length) return [];
    let eq = equityCurve.length > 0 ? equityCurve[0].equity : 100000;
    let peak = eq;
    return subset.map((t) => {
      eq += t.pnlNet;
      if (eq > peak) peak = eq;
      return { timestamp: t.exitTime, equity: eq, drawdown: peak > 0 ? (peak - eq) / peak : 0 };
    });
  };

  return {
    all: calculateExtendedMetrics(trades, equityCurve),
    long: calculateExtendedMetrics(longTrades, buildSubCurve(longTrades)),
    short: calculateExtendedMetrics(shortTrades, buildSubCurve(shortTrades)),
  };
}

export function computeStreaks(pnls: number[]): { maxConsecWins: number; maxConsecLosses: number } {
  let maxW = 0, maxL = 0, curW = 0, curL = 0;
  for (const p of pnls) {
    if (p > 0) { curW++; curL = 0; maxW = Math.max(maxW, curW); }
    else if (p < 0) { curL++; curW = 0; maxL = Math.max(maxL, curL); }
    else { curW = 0; curL = 0; }
  }
  return { maxConsecWins: maxW, maxConsecLosses: maxL };
}

export function getStreakSequence(trades: Trade[]): { start: number; length: number; type: "win" | "loss"; totalPnl: number }[] {
  const streaks: { start: number; length: number; type: "win" | "loss"; totalPnl: number }[] = [];
  if (!trades.length) return streaks;

  let currentType: "win" | "loss" | null = null;
  let start = 0;
  let length = 0;
  let totalPnl = 0;

  trades.forEach((t, i) => {
    const type = t.pnlNet >= 0 ? "win" : "loss";
    if (type === currentType) {
      length++;
      totalPnl += t.pnlNet;
    } else {
      if (currentType !== null) streaks.push({ start, length, type: currentType, totalPnl });
      currentType = type;
      start = i;
      length = 1;
      totalPnl = t.pnlNet;
    }
  });
  if (currentType !== null) streaks.push({ start, length, type: currentType, totalPnl });
  return streaks;
}

export function computeRollingExpectancy(trades: Trade[], window = 20): { tradeIndex: number; expectancy: number }[] {
  const results: { tradeIndex: number; expectancy: number }[] = [];
  for (let i = window - 1; i < trades.length; i++) {
    const slice = trades.slice(i - window + 1, i + 1);
    const pnls = slice.map((t) => t.pnlNet);
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const wr = wins.length / pnls.length;
    const avgW = wins.length ? wins.reduce((a, b) => a + b, 0) / wins.length : 0;
    const avgL = losses.length ? Math.abs(losses.reduce((a, b) => a + b, 0) / losses.length) : 0;
    results.push({ tradeIndex: i, expectancy: wr * avgW - (1 - wr) * avgL });
  }
  return results;
}

export function computeRollingSharpe(trades: Trade[], window = 30): { tradeIndex: number; sharpe: number }[] {
  const results: { tradeIndex: number; sharpe: number }[] = [];
  for (let i = window - 1; i < trades.length; i++) {
    const slice = trades.slice(i - window + 1, i + 1).map((t) => t.pnlNet);
    const mean = slice.reduce((a, b) => a + b, 0) / slice.length;
    const sd = stdDev(slice);
    results.push({ tradeIndex: i, sharpe: sd > 0 ? (mean / sd) * Math.sqrt(TRADING_DAYS) : 0 });
  }
  return results;
}

function computeMaxRecoveryDays(curve: EquityPoint[]): number {
  if (curve.length < 2) return 0;
  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  let peak = 0;
  let peakDate = new Date(sorted[0].timestamp);
  let maxRecovery = 0;

  for (const p of sorted) {
    if (p.equity >= peak) {
      const recoveryMs = new Date(p.timestamp).getTime() - peakDate.getTime();
      const recoveryDays = recoveryMs / (1000 * 60 * 60 * 24);
      if (recoveryDays > maxRecovery) maxRecovery = recoveryDays;
      peak = p.equity;
      peakDate = new Date(p.timestamp);
    }
  }
  return Math.round(maxRecovery);
}

// Time-based grouping helpers
export function groupByTimeOfDay(trades: Trade[], useEntryTime = false): Map<string, Trade[]> {
  const groups = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const timeStr = useEntryTime ? t.entryTime : t.exitTime;
    const h = getESTHour(timeStr);
    const m = getESTMinutes(timeStr) < 30 ? 0 : 30;
    const key = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const arr = groups.get(key) || [];
    arr.push(t);
    groups.set(key, arr);
  });
  return groups;
}

export function groupByDayOfWeek(trades: Trade[]): Map<string, Trade[]> {
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const groups = new Map<string, Trade[]>();
  trades.forEach((t) => {
    const key = days[getESTDayOfWeek(t.exitTime)];
    const arr = groups.get(key) || [];
    arr.push(t);
    groups.set(key, arr);
  });
  return groups;
}

export function groupByPeriod(trades: Trade[], period: "daily" | "weekly" | "monthly"): Map<string, Trade[]> {
  const groups = new Map<string, Trade[]>();
  trades.forEach((t) => {
    let key: string;
    if (period === "daily") {
      key = getESTDateKey(t.exitTime);
    } else if (period === "weekly") {
      // Get EST date key, then find start of week
      const estDateStr = getESTDateKey(t.exitTime);
      const dow = getESTDayOfWeek(t.exitTime);
      const d = new Date(estDateStr);
      d.setDate(d.getDate() - dow);
      key = d.toISOString().slice(0, 10);
    } else {
      const { year, month } = getESTYearMonth(t.exitTime);
      key = `${year}-${String(month + 1).padStart(2, "0")}`;
    }
    const arr = groups.get(key) || [];
    arr.push(t);
    groups.set(key, arr);
  });
  return groups;
}

export function summarizeGroup(trades: Trade[]) {
  const pnls = trades.map((t) => t.pnlNet);
  const wins = pnls.filter((p) => p > 0);
  return {
    count: trades.length,
    netProfit: pnls.reduce((a, b) => a + b, 0),
    grossProfit: wins.reduce((a, b) => a + b, 0),
    grossLoss: Math.abs(pnls.filter((p) => p < 0).reduce((a, b) => a + b, 0)),
    winRate: trades.length > 0 ? (wins.length / trades.length) * 100 : 0,
    avgTrade: trades.length > 0 ? pnls.reduce((a, b) => a + b, 0) / trades.length : 0,
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
  // Use absolute dollar difference instead of percentage (safe for $0-start curves)
  return Object.values(monthly).map((m) => ({
    year: m.year,
    month: m.month,
    return: m.end - m.start,
  }));
}

// ── Internals ──

function getResampledDailyReturns(curve: EquityPoint[]): number[] {
  if (curve.length < 2) return [];
  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const equityByDate = new Map<string, number>();
  sorted.forEach((p) => {
    const dateKey = new Date(p.timestamp).toISOString().slice(0, 10);
    equityByDate.set(dateKey, p.equity);
  });
  const firstDate = new Date(sorted[0].timestamp);
  const lastDate = new Date(sorted[sorted.length - 1].timestamp);
  firstDate.setHours(0, 0, 0, 0);
  lastDate.setHours(0, 0, 0, 0);
  const dailyEquities: number[] = [];
  let lastKnownEquity = sorted[0].equity;
  const current = new Date(firstDate);
  while (current <= lastDate) {
    const key = current.toISOString().slice(0, 10);
    if (equityByDate.has(key)) lastKnownEquity = equityByDate.get(key)!;
    dailyEquities.push(lastKnownEquity);
    current.setDate(current.getDate() + 1);
  }
  // Use absolute dollar differences (safe for $0-start cumulative PnL curves)
  const returns: number[] = [];
  for (let i = 1; i < dailyEquities.length; i++) {
    returns.push(dailyEquities[i] - dailyEquities[i - 1]);
  }
  return returns;
}

function computeAnnualizedReturn(curve: EquityPoint[]): number {
  if (curve.length < 2) return 0;
  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const totalDays = (new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[0].timestamp).getTime()) / (1000 * 60 * 60 * 24);
  if (totalDays < 1) return 0;
  const totalPnl = sorted[sorted.length - 1].equity - sorted[0].equity;
  // Annualized dollar PnL per day, returned as raw dollar value
  return (totalPnl / totalDays) * 365;
}

function maxDrawdown(curve: EquityPoint[]): number {
  if (curve.length < 1) return 0;
  let peak = -Infinity;
  let maxDD = 0;
  curve.forEach((p) => {
    if (p.equity > peak) peak = p.equity;
    const dd = peak - p.equity;
    if (dd > maxDD) maxDD = dd;
  });
  // Return absolute dollar drawdown
  return maxDD;
}

export function stdDev(arr: number[]): number {
  if (arr.length < 2) return 0;
  const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
  const sq = arr.reduce((sum, v) => sum + (v - mean) ** 2, 0);
  return Math.sqrt(sq / (arr.length - 1));
}

function emptyMetrics(): StrategyMetrics {
  return { totalReturn: 0, annualizedReturn: 0, sharpeRatio: 0, sortinoRatio: 0, calmarRatio: 0, maxDrawdown: 0, maxDrawdownDuration: 0, winRate: 0, profitFactor: 0, expectancy: 0, totalTrades: 0, avgWin: 0, avgLoss: 0, bestTrade: 0, worstTrade: 0, avgHoldingPeriod: 0 };
}

function emptyExtended(): Omit<ExtendedMetrics, keyof StrategyMetrics> {
  return { grossProfit: 0, grossLoss: 0, totalCommission: 0, maxConsecWins: 0, maxConsecLosses: 0, avgTradesPerDay: 0, profitPerMonth: 0, maxRecoveryDays: 0, startDate: "", endDate: "", winningTrades: 0, losingTrades: 0, evenTrades: 0, avgWinLossRatio: 0 };
}
