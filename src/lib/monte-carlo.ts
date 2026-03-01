import { MonteCarloResult } from "@/types";

export function runMonteCarlo(
  pnls: number[],
  startingEquity = 100000,
  numSimulations = 1000,
  ruinThreshold = 0.5
): MonteCarloResult {
  if (!pnls.length) {
    return {
      simulations: 0,
      percentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
      maxDrawdownPercentiles: { p5: 0, p25: 0, p50: 0, p75: 0, p95: 0 },
      riskOfRuin: 0,
      equityPaths: [],
    };
  }

  const numTrades = pnls.length;
  const finalEquities: number[] = [];
  const maxDrawdowns: number[] = [];
  let ruinCount = 0;
  const ruinLevel = startingEquity * ruinThreshold;

  // Store subset of paths for charting (max 100)
  const pathsToStore = Math.min(numSimulations, 100);
  const equityPaths: number[][] = [];

  for (let sim = 0; sim < numSimulations; sim++) {
    let equity = startingEquity;
    let peak = equity;
    let maxDD = 0;
    let ruined = false;
    const path: number[] = sim < pathsToStore ? [equity] : [];

    for (let t = 0; t < numTrades; t++) {
      const randomIndex = Math.floor(Math.random() * numTrades);
      equity += pnls[randomIndex];

      if (equity > peak) peak = equity;
      const dd = peak > 0 ? (peak - equity) / peak : 0;
      if (dd > maxDD) maxDD = dd;
      if (equity <= ruinLevel) ruined = true;

      if (sim < pathsToStore) path.push(equity);
    }

    finalEquities.push(equity);
    maxDrawdowns.push(maxDD * 100);
    if (ruined) ruinCount++;
    if (sim < pathsToStore) equityPaths.push(path);
  }

  finalEquities.sort((a, b) => a - b);
  maxDrawdowns.sort((a, b) => a - b);

  const pct = (arr: number[], p: number) => arr[Math.floor(arr.length * p)] || 0;

  return {
    simulations: numSimulations,
    percentiles: {
      p5: pct(finalEquities, 0.05),
      p25: pct(finalEquities, 0.25),
      p50: pct(finalEquities, 0.5),
      p75: pct(finalEquities, 0.75),
      p95: pct(finalEquities, 0.95),
    },
    maxDrawdownPercentiles: {
      p5: pct(maxDrawdowns, 0.05),
      p25: pct(maxDrawdowns, 0.25),
      p50: pct(maxDrawdowns, 0.5),
      p75: pct(maxDrawdowns, 0.75),
      p95: pct(maxDrawdowns, 0.95),
    },
    riskOfRuin: (ruinCount / numSimulations) * 100,
    equityPaths,
  };
}
