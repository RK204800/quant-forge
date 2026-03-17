import { Trade, EquityPoint, MonteCarloResult } from "@/types";
import { runMonteCarlo } from "@/lib/monte-carlo";
import { getESTDateKey } from "@/lib/timezone";

export interface StrategyWithWeight {
  id: string;
  name: string;
  trades: Trade[];
  equityCurve: EquityPoint[];
  weight: number;
}

// ── Kelly Criterion ──────────────────────────────────────────────
export interface KellyResult {
  strategyId: string;
  strategyName: string;
  winRate: number;
  avgWin: number;
  avgLoss: number;
  rewardToRisk: number;
  kellyFraction: number;
  halfKelly: number;
  currentWeight: number;
  kellyDelta: number; // current - halfKelly
}

export function calculateKelly(strategies: StrategyWithWeight[]): KellyResult[] {
  return strategies.map((s) => {
    const wins = s.trades.filter((t) => t.pnlNet > 0);
    const losses = s.trades.filter((t) => t.pnlNet < 0);
    const winRate = s.trades.length > 0 ? wins.length / s.trades.length : 0;
    const avgWin = wins.length > 0 ? wins.reduce((a, t) => a + t.pnlNet, 0) / wins.length : 0;
    const avgLoss = losses.length > 0 ? Math.abs(losses.reduce((a, t) => a + t.pnlNet, 0) / losses.length) : 1;
    const R = avgLoss > 0 ? avgWin / avgLoss : 0;
    const kelly = R > 0 ? winRate - (1 - winRate) / R : 0;
    const halfKelly = Math.max(0, kelly / 2) * 100;
    const totalWeight = strategies.reduce((a, st) => a + st.weight, 0) || 1;
    const normalizedWeight = (s.weight / totalWeight) * 100;

    return {
      strategyId: s.id,
      strategyName: s.name,
      winRate,
      avgWin,
      avgLoss,
      rewardToRisk: R,
      kellyFraction: Math.max(0, kelly) * 100,
      halfKelly,
      currentWeight: normalizedWeight,
      kellyDelta: normalizedWeight - halfKelly,
    };
  });
}

// ── MAE Stress Test ──────────────────────────────────────────────
export interface MAEStressResult {
  strategyId: string;
  strategyName: string;
  worstMAE: number;
  weight: number;
  weightedContrib: number;
}

export interface StressTestSummary {
  perStrategy: MAEStressResult[];
  totalUnweighted: number;
  totalWeighted: number;
  pctOfCapital: number;
}

export function calculateMAEStressTest(
  strategies: StrategyWithWeight[],
  accountSize: number
): StressTestSummary {
  const totalWeight = strategies.reduce((a, s) => a + s.weight, 0) || 1;

  const perStrategy: MAEStressResult[] = strategies.map((s) => {
    // Use MAE if available, otherwise estimate from worst trade PnL
    const worstMAE = s.trades.reduce((worst, t) => {
      const mae = t.mae != null ? Math.abs(t.mae) : Math.abs(Math.min(0, t.pnlNet));
      return Math.max(worst, mae);
    }, 0);

    const normalizedWeight = s.weight / totalWeight;
    return {
      strategyId: s.id,
      strategyName: s.name,
      worstMAE,
      weight: normalizedWeight * 100,
      weightedContrib: worstMAE * normalizedWeight,
    };
  });

  const totalUnweighted = perStrategy.reduce((a, s) => a + s.worstMAE, 0);
  const totalWeighted = perStrategy.reduce((a, s) => a + s.weightedContrib, 0);

  return {
    perStrategy,
    totalUnweighted,
    totalWeighted,
    pctOfCapital: accountSize > 0 ? (totalWeighted / accountSize) * 100 : 0,
  };
}

// ── Portfolio Heat ───────────────────────────────────────────────
export interface PortfolioHeatResult {
  heatPct: number;
  riskBudgetUsed: number;
  status: "green" | "yellow" | "red";
  maxRiskThreshold: number;
}

export function calculatePortfolioHeat(
  stressTest: StressTestSummary,
  accountSize: number,
  maxRiskPct = 6
): PortfolioHeatResult {
  const heatPct = stressTest.pctOfCapital;
  const maxRiskThreshold = maxRiskPct;
  const riskBudgetUsed = maxRiskPct > 0 ? (heatPct / maxRiskPct) * 100 : 100;
  const status: "green" | "yellow" | "red" =
    riskBudgetUsed < 50 ? "green" : riskBudgetUsed < 80 ? "yellow" : "red";

  return { heatPct, riskBudgetUsed, status, maxRiskThreshold };
}

// ── Diversification Score ────────────────────────────────────────
export interface DiversificationResult {
  ratio: number;
  score: number;
  label: "Poor" | "Fair" | "Good" | "Excellent";
  correlationMatrix: number[][];
}

function getDailyReturns(curve: EquityPoint[]): Map<string, number> {
  const sorted = [...curve].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  const daily = new Map<string, number>();
  for (let i = 1; i < sorted.length; i++) {
    const dateKey = format(new Date(sorted[i].timestamp), "yyyy-MM-dd");
    const ret = sorted[i].equity - sorted[i - 1].equity;
    daily.set(dateKey, ret);
  }
  return daily;
}

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export function calculateDiversification(
  strategies: StrategyWithWeight[]
): DiversificationResult {
  if (strategies.length < 2) {
    return { ratio: 1, score: 0, label: "Poor", correlationMatrix: [[1]] };
  }

  const totalWeight = strategies.reduce((a, s) => a + s.weight, 0) || 1;
  const weights = strategies.map((s) => s.weight / totalWeight);

  // Build daily return series
  const returnMaps = strategies.map((s) => getDailyReturns(s.equityCurve));
  const allDates = new Set<string>();
  returnMaps.forEach((m) => m.forEach((_, k) => allDates.add(k)));
  const commonDates = [...allDates]
    .filter((d) => strategies.every((_, i) => returnMaps[i].has(d)))
    .sort();

  const returnArrays = strategies.map((_, i) =>
    commonDates.map((d) => returnMaps[i].get(d) || 0)
  );

  // Correlation matrix
  const corrMatrix = strategies.map((_, i) =>
    strategies.map((_, j) => (i === j ? 1 : pearson(returnArrays[i], returnArrays[j])))
  );

  // Individual volatilities
  const vols = returnArrays.map((r) => {
    const mean = r.reduce((a, v) => a + v, 0) / (r.length || 1);
    const variance = r.reduce((a, v) => a + (v - mean) ** 2, 0) / (r.length || 1);
    return Math.sqrt(variance);
  });

  // Weighted sum of individual vols
  const weightedVolSum = weights.reduce((a, w, i) => a + w * vols[i], 0);

  // Portfolio volatility via covariance matrix
  let portfolioVariance = 0;
  for (let i = 0; i < strategies.length; i++) {
    for (let j = 0; j < strategies.length; j++) {
      portfolioVariance += weights[i] * weights[j] * vols[i] * vols[j] * corrMatrix[i][j];
    }
  }
  const portfolioVol = Math.sqrt(Math.max(0, portfolioVariance));

  const ratio = portfolioVol > 0 ? weightedVolSum / portfolioVol : 1;

  // Normalize to 0-100. DR=1 means no diversification benefit, DR=2+ is excellent
  const score = Math.min(100, Math.max(0, (ratio - 1) * 100));
  const label: DiversificationResult["label"] =
    score >= 60 ? "Excellent" : score >= 35 ? "Good" : score >= 15 ? "Fair" : "Poor";

  return { ratio, score, label, correlationMatrix: corrMatrix };
}

// ── Tail Risk (VaR / CVaR) ───────────────────────────────────────
export interface TailRiskResult {
  var95: number;
  var99: number;
  cvar95: number;
  cvar99: number;
  dailyPnls: number[];
}

export function calculateTailRisk(strategies: StrategyWithWeight[]): TailRiskResult {
  const totalWeight = strategies.reduce((a, s) => a + s.weight, 0) || 1;

  // Combine daily PnLs weighted
  const dailyMap = new Map<string, number>();
  strategies.forEach((s) => {
    const w = s.weight / totalWeight;
    const returns = getDailyReturns(s.equityCurve);
    returns.forEach((ret, date) => {
      dailyMap.set(date, (dailyMap.get(date) || 0) + ret * w);
    });
  });

  const pnls = [...dailyMap.values()].sort((a, b) => a - b);
  if (pnls.length < 5) {
    return { var95: 0, var99: 0, cvar95: 0, cvar99: 0, dailyPnls: pnls };
  }

  const pct = (p: number) => pnls[Math.floor(pnls.length * p)] || 0;
  const var95 = pct(0.05);
  const var99 = pct(0.01);

  const idx95 = Math.floor(pnls.length * 0.05);
  const idx99 = Math.floor(pnls.length * 0.01);
  const cvar95 = idx95 > 0 ? pnls.slice(0, idx95).reduce((a, v) => a + v, 0) / idx95 : var95;
  const cvar99 = idx99 > 0 ? pnls.slice(0, idx99).reduce((a, v) => a + v, 0) / idx99 : var99;

  return { var95, var99, cvar95, cvar99, dailyPnls: pnls };
}

// ── Concentration Risk ───────────────────────────────────────────
export interface ConcentrationResult {
  hhi: number;
  hhiNormalized: number;
  maxWeightStrategy: string;
  maxWeight: number;
  isConcentrated: boolean;
  instrumentOverlap: { instrument: string; strategies: string[] }[];
}

export function calculateConcentration(
  strategies: StrategyWithWeight[],
  concentrationThreshold = 40
): ConcentrationResult {
  const totalWeight = strategies.reduce((a, s) => a + s.weight, 0) || 1;
  const weights = strategies.map((s) => s.weight / totalWeight);

  const hhi = weights.reduce((a, w) => a + w * w, 0);
  const n = strategies.length;
  const hhiNormalized = n > 1 ? (hhi - 1 / n) / (1 - 1 / n) : 1;

  let maxWeight = 0;
  let maxWeightStrategy = "";
  weights.forEach((w, i) => {
    if (w > maxWeight) {
      maxWeight = w;
      maxWeightStrategy = strategies[i].name;
    }
  });

  // Instrument overlap
  const instrumentMap = new Map<string, Set<string>>();
  strategies.forEach((s) => {
    const instruments = new Set(s.trades.map((t) => t.instrument));
    instruments.forEach((inst) => {
      if (!instrumentMap.has(inst)) instrumentMap.set(inst, new Set());
      instrumentMap.get(inst)!.add(s.name);
    });
  });

  const instrumentOverlap = [...instrumentMap.entries()]
    .filter(([, strats]) => strats.size > 1)
    .map(([instrument, strats]) => ({ instrument, strategies: [...strats] }));

  return {
    hhi,
    hhiNormalized,
    maxWeightStrategy,
    maxWeight: maxWeight * 100,
    isConcentrated: maxWeight * 100 > concentrationThreshold,
    instrumentOverlap,
  };
}

// ── Portfolio Monte Carlo ────────────────────────────────────────
export function runPortfolioMonteCarlo(
  strategies: StrategyWithWeight[],
  accountSize: number
): MonteCarloResult | null {
  const totalWeight = strategies.reduce((a, s) => a + s.weight, 0) || 1;

  // Combine all trades weighted by strategy weight
  const combinedPnls: { time: number; pnl: number }[] = [];
  strategies.forEach((s) => {
    const w = s.weight / totalWeight;
    s.trades.forEach((t) => {
      combinedPnls.push({ time: new Date(t.exitTime).getTime(), pnl: t.pnlNet * w });
    });
  });

  combinedPnls.sort((a, b) => a.time - b.time);
  const pnls = combinedPnls.map((p) => p.pnl);

  if (pnls.length < 5) return null;
  return runMonteCarlo(pnls, accountSize, 500);
}

// ── Composite Portfolio Stability Score ──────────────────────────
export interface PortfolioScoreResult {
  overall: number;
  grade: string;
  diversificationScore: number;
  kellyAlignmentScore: number;
  drawdownResilienceScore: number;
  tailRiskScore: number;
}

export function calculatePortfolioScore(
  diversification: DiversificationResult,
  kelly: KellyResult[],
  stressTest: StressTestSummary,
  tailRisk: TailRiskResult,
  accountSize: number
): PortfolioScoreResult {
  // 1. Diversification (0-100)
  const diversificationScore = diversification.score;

  // 2. Kelly alignment: how close current weights are to half-kelly optimal
  const kellyAlignmentScore = (() => {
    if (kelly.length === 0) return 50;
    const avgDeviation = kelly.reduce((a, k) => a + Math.abs(k.kellyDelta), 0) / kelly.length;
    // 0 deviation = 100, >50% deviation = 0
    return Math.max(0, Math.min(100, 100 - avgDeviation * 2));
  })();

  // 3. Drawdown resilience: worst-case MAE vs account
  const drawdownResilienceScore = (() => {
    const pct = stressTest.pctOfCapital;
    // 0% = 100, 100% = 0
    return Math.max(0, Math.min(100, 100 - pct));
  })();

  // 4. Tail risk: CVaR relative to account
  const tailRiskScore = (() => {
    if (accountSize <= 0) return 50;
    const cvarPct = Math.abs(tailRisk.cvar95) / accountSize * 100;
    // 0% = 100, >5% daily CVaR = 0
    return Math.max(0, Math.min(100, 100 - cvarPct * 20));
  })();

  const overall = Math.round(
    diversificationScore * 0.25 +
    kellyAlignmentScore * 0.25 +
    drawdownResilienceScore * 0.25 +
    tailRiskScore * 0.25
  );

  const grade =
    overall >= 90 ? "A+" : overall >= 85 ? "A" : overall >= 80 ? "A-" :
    overall >= 75 ? "B+" : overall >= 70 ? "B" : overall >= 65 ? "B-" :
    overall >= 60 ? "C+" : overall >= 55 ? "C" : overall >= 50 ? "C-" :
    overall >= 45 ? "D+" : overall >= 40 ? "D" : "F";

  return {
    overall,
    grade,
    diversificationScore,
    kellyAlignmentScore,
    drawdownResilienceScore,
    tailRiskScore,
  };
}
