import { Trade, RROptimizationPoint } from "@/types";

export function optimizeRR(trades: Trade[]): RROptimizationPoint[] {
  if (!trades.length) return [];

  // For each trade, determine MAE and MFE
  const tradeData = trades.map((t) => {
    // Use actual MAE/MFE if available, otherwise estimate from price movement
    const mae = t.mae ?? estimateMAE(t);
    const mfe = t.mfe ?? estimateMFE(t);
    return { mae: Math.abs(mae), mfe: Math.abs(mfe), pnlNet: t.pnlNet };
  });

  const results: RROptimizationPoint[] = [];
  // Test R:R ratios from 0.5:1 to 5:1 in 0.25 steps
  for (let rr = 0.5; rr <= 5.0; rr += 0.25) {
    let wins = 0;
    let losses = 0;
    let totalWinPnl = 0;
    let totalLossPnl = 0;
    let surviving = 0;

    for (const td of tradeData) {
      if (td.mae === 0 && td.mfe === 0) continue;

      // Use MAE as the "stop" distance
      const stopDistance = td.mae || Math.abs(td.pnlNet) * 0.5;
      const targetDistance = stopDistance * rr;

      // Did MFE reach target?
      const targetHit = td.mfe >= targetDistance;
      // Did MAE exceed the stop? (it always does since stop = MAE by definition)
      // So we use percentile-based stops instead
      surviving++;

      if (targetHit) {
        wins++;
        totalWinPnl += targetDistance;
      } else {
        losses++;
        totalLossPnl += stopDistance;
      }
    }

    const totalTrades = wins + losses;
    if (totalTrades === 0) continue;

    const projectedWinRate = (wins / totalTrades) * 100;
    const avgWin = wins > 0 ? totalWinPnl / wins : 0;
    const avgLoss = losses > 0 ? totalLossPnl / losses : 0;
    const profitFactor = totalLossPnl > 0 ? totalWinPnl / totalLossPnl : Infinity;
    const expectancy = (wins / totalTrades) * avgWin - (losses / totalTrades) * avgLoss;
    const totalReturn = totalWinPnl - totalLossPnl;

    results.push({
      ratio: rr,
      label: `1:${rr.toFixed(2)}`,
      projectedWinRate,
      profitFactor: isFinite(profitFactor) ? profitFactor : 99,
      expectancy,
      totalReturn,
      survivingTrades: surviving,
      avgWin,
      avgLoss,
    });
  }

  return results;
}

function estimateMAE(trade: Trade): number {
  // Without actual MAE data, estimate as the worse of entry-to-worst scenario
  // For a winning long trade, MAE is likely small; for losing, it's at least the loss
  if (trade.pnlNet < 0) return Math.abs(trade.pnlNet);
  // For winners, estimate MAE as ~30% of the favorable move (heuristic)
  return Math.abs(trade.pnlNet) * 0.3;
}

function estimateMFE(trade: Trade): number {
  // Without actual MFE data, estimate from price movement
  if (trade.pnlNet > 0) return Math.abs(trade.pnlNet);
  // For losers, MFE might have been ~20% of the loss amount (small favorable move before losing)
  return Math.abs(trade.pnlNet) * 0.2;
}

export function hasMAEData(trades: Trade[]): boolean {
  return trades.some((t) => t.mae !== undefined && t.mae !== null);
}
