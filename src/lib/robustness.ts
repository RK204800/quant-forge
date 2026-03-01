import { Trade, EquityPoint, WalkForwardSegment, RegimeInfo, StabilityScore } from "@/types";
import { stdDev } from "./analytics";

export function walkForwardAnalysis(trades: Trade[], equityCurve: EquityPoint[], segments = 5): WalkForwardSegment[] {
  if (trades.length < segments * 2) return [];

  const segSize = Math.floor(trades.length / segments);
  const results: WalkForwardSegment[] = [];

  for (let s = 0; s < segments; s++) {
    const start = s * segSize;
    const end = s === segments - 1 ? trades.length : (s + 1) * segSize;
    const subset = trades.slice(start, end);
    const pnls = subset.map((t) => t.pnlNet);
    const wins = pnls.filter((p) => p > 0);
    const losses = pnls.filter((p) => p < 0);
    const mean = pnls.reduce((a, b) => a + b, 0) / pnls.length;
    const sd = stdDev(pnls);

    results.push({
      segmentIndex: s,
      tradeCount: subset.length,
      sharpe: sd > 0 ? (mean / sd) * Math.sqrt(252) : 0,
      winRate: (wins.length / pnls.length) * 100,
      profitFactor: losses.length > 0
        ? wins.reduce((a, b) => a + b, 0) / Math.abs(losses.reduce((a, b) => a + b, 0))
        : Infinity,
      totalReturn: pnls.reduce((a, b) => a + b, 0),
    });
  }

  return results;
}

export function returnDistribution(trades: Trade[]): { skewness: number; kurtosis: number; mean: number; stdDev: number } {
  const pnls = trades.map((t) => t.pnlNet);
  if (pnls.length < 4) return { skewness: 0, kurtosis: 0, mean: 0, stdDev: 0 };

  const n = pnls.length;
  const mean = pnls.reduce((a, b) => a + b, 0) / n;
  const sd = stdDev(pnls);
  if (sd === 0) return { skewness: 0, kurtosis: 0, mean, stdDev: 0 };

  const m3 = pnls.reduce((sum, v) => sum + Math.pow((v - mean) / sd, 3), 0) / n;
  const m4 = pnls.reduce((sum, v) => sum + Math.pow((v - mean) / sd, 4), 0) / n;

  return { skewness: m3, kurtosis: m4 - 3, mean, stdDev: sd };
}

export function detectRegimes(equityCurve: EquityPoint[], windowDays = 30): RegimeInfo[] {
  if (equityCurve.length < 2) return [];

  const sorted = [...equityCurve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const regimes: RegimeInfo[] = [];
  let currentType: "bull" | "bear" | null = null;
  let regimeStart = 0;

  for (let i = 1; i < sorted.length; i++) {
    const change = sorted[i].equity - sorted[i - 1].equity;
    const type: "bull" | "bear" = change >= 0 ? "bull" : "bear";

    if (type !== currentType) {
      if (currentType !== null && i - regimeStart > 1) {
        const startEq = sorted[regimeStart].equity;
        const endEq = sorted[i - 1].equity;
        regimes.push({
          type: currentType,
          startDate: sorted[regimeStart].timestamp,
          endDate: sorted[i - 1].timestamp,
          duration: Math.round((new Date(sorted[i - 1].timestamp).getTime() - new Date(sorted[regimeStart].timestamp).getTime()) / (1000 * 60 * 60 * 24)),
          returnPct: startEq > 0 ? ((endEq - startEq) / startEq) * 100 : 0,
          sharpe: 0,
        });
      }
      currentType = type;
      regimeStart = i;
    }
  }

  // Close last regime
  if (currentType !== null && sorted.length - regimeStart > 1) {
    const startEq = sorted[regimeStart].equity;
    const endEq = sorted[sorted.length - 1].equity;
    regimes.push({
      type: currentType,
      startDate: sorted[regimeStart].timestamp,
      endDate: sorted[sorted.length - 1].timestamp,
      duration: Math.round((new Date(sorted[sorted.length - 1].timestamp).getTime() - new Date(sorted[regimeStart].timestamp).getTime()) / (1000 * 60 * 60 * 24)),
      returnPct: startEq > 0 ? ((endEq - startEq) / startEq) * 100 : 0,
      sharpe: 0,
    });
  }

  // Merge short regimes (< 3 points) with neighbors
  return regimes.filter((r) => r.duration > 0);
}

export function calculateStabilityScore(segments: WalkForwardSegment[]): StabilityScore {
  if (segments.length < 2) return { overall: 0, sharpeConsistency: 0, drawdownRecovery: 0, winRateStability: 0, profitFactorStability: 0 };

  const sharpes = segments.map((s) => s.sharpe);
  const winRates = segments.map((s) => s.winRate);
  const pfs = segments.map((s) => Math.min(s.profitFactor, 10)); // Cap infinity

  // Consistency = 1 - coefficient of variation (capped 0-100)
  const cv = (arr: number[]) => {
    const mean = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (mean === 0) return 1;
    const sd = stdDev(arr);
    return Math.abs(sd / mean);
  };

  const sharpeConsistency = Math.max(0, Math.min(100, (1 - cv(sharpes)) * 100));
  const winRateStability = Math.max(0, Math.min(100, (1 - cv(winRates)) * 100));
  const profitFactorStability = Math.max(0, Math.min(100, (1 - cv(pfs)) * 100));

  // Drawdown recovery: proportion of segments with positive returns
  const positiveSegments = segments.filter((s) => s.totalReturn > 0).length;
  const drawdownRecovery = (positiveSegments / segments.length) * 100;

  const overall = (sharpeConsistency * 0.3 + drawdownRecovery * 0.3 + winRateStability * 0.2 + profitFactorStability * 0.2);

  return { overall: Math.round(overall), sharpeConsistency: Math.round(sharpeConsistency), drawdownRecovery: Math.round(drawdownRecovery), winRateStability: Math.round(winRateStability), profitFactorStability: Math.round(profitFactorStability) };
}
