import { Strategy, Trade, EquityPoint } from "@/types";
import { calculateMetrics, getMonthlyReturns } from "@/lib/analytics";
import { PortfolioRow } from "@/hooks/use-portfolios";

export function buildStrategyContext(strategy: Strategy): string {
  const { trades, equityCurve } = strategy;
  if (!trades.length) return `Strategy "${strategy.name}" has no trades yet.`;

  const m = calculateMetrics(trades, equityCurve);
  const monthly = getMonthlyReturns(equityCurve);

  const wins = trades.filter(t => t.pnlNet > 0);
  const losses = trades.filter(t => t.pnlNet < 0);
  const pnls = trades.map(t => t.pnlNet).sort((a, b) => a - b);

  // Streak analysis
  let maxConsecWins = 0, maxConsecLosses = 0, cw = 0, cl = 0;
  for (const t of trades) {
    if (t.pnlNet > 0) { cw++; cl = 0; maxConsecWins = Math.max(maxConsecWins, cw); }
    else if (t.pnlNet < 0) { cl++; cw = 0; maxConsecLosses = Math.max(maxConsecLosses, cl); }
    else { cw = 0; cl = 0; }
  }

  // Day-of-week performance
  const dowPnl: Record<string, number[]> = {};
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  for (const t of trades) {
    const d = days[new Date(t.entryTime).getDay()];
    (dowPnl[d] ??= []).push(t.pnlNet);
  }
  const dowSummary = Object.entries(dowPnl)
    .map(([d, pnls]) => `${d}: ${pnls.length} trades, avg $${(pnls.reduce((a, b) => a + b, 0) / pnls.length).toFixed(2)}`)
    .join("; ");

  // Hour performance
  const hourPnl: Record<number, number[]> = {};
  for (const t of trades) {
    const h = new Date(t.entryTime).getHours();
    (hourPnl[h] ??= []).push(t.pnlNet);
  }
  const topHours = Object.entries(hourPnl)
    .map(([h, pnls]) => ({ h: +h, avg: pnls.reduce((a, b) => a + b, 0) / pnls.length, n: pnls.length }))
    .sort((a, b) => b.avg - a.avg)
    .slice(0, 5)
    .map(x => `${x.h}:00 avg $${x.avg.toFixed(2)} (${x.n} trades)`)
    .join("; ");

  // Direction breakdown
  const longs = trades.filter(t => t.direction === "long");
  const shorts = trades.filter(t => t.direction === "short");
  const longPnl = longs.reduce((a, t) => a + t.pnlNet, 0);
  const shortPnl = shorts.reduce((a, t) => a + t.pnlNet, 0);

  // Instrument breakdown
  const instrPnl: Record<string, { n: number; pnl: number }> = {};
  for (const t of trades) {
    const e = (instrPnl[t.instrument] ??= { n: 0, pnl: 0 });
    e.n++; e.pnl += t.pnlNet;
  }
  const instrSummary = Object.entries(instrPnl)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 10)
    .map(([i, d]) => `${i}: ${d.n} trades, $${d.pnl.toFixed(2)}`)
    .join("; ");

  // Monthly returns summary (last 12)
  const recentMonthly = monthly.slice(-12)
    .map(m => `${m.year}-${String(m.month).padStart(2, "0")}: $${m.return.toFixed(2)}`)
    .join("; ");

  const lines = [
    `# Strategy: ${strategy.name}`,
    `Description: ${strategy.description || "N/A"}`,
    `Asset Class: ${strategy.assetClass}, Timeframe: ${strategy.timeframe}`,
    `Status: ${strategy.status}, Engine: ${strategy.backtestEngine}`,
    "",
    "## Key Metrics",
    `Total Return: $${m.totalReturn.toFixed(2)}`,
    `Annualized Return: ${(m.annualizedReturn * 100).toFixed(2)}%`,
    `Sharpe Ratio: ${m.sharpeRatio.toFixed(3)}`,
    `Sortino Ratio: ${m.sortinoRatio.toFixed(3)}`,
    `Calmar Ratio: ${m.calmarRatio.toFixed(3)}`,
    `Max Drawdown: $${m.maxDrawdown.toFixed(2)}`,
    `Win Rate: ${(m.winRate * 100).toFixed(1)}%`,
    `Profit Factor: ${m.profitFactor === Infinity ? "∞" : m.profitFactor.toFixed(3)}`,
    `Expectancy: $${m.expectancy.toFixed(2)}`,
    `Total Trades: ${m.totalTrades}`,
    `Avg Win: $${m.avgWin.toFixed(2)}, Avg Loss: $${m.avgLoss.toFixed(2)}`,
    `Best Trade: $${m.bestTrade.toFixed(2)}, Worst Trade: $${m.worstTrade.toFixed(2)}`,
    `Avg Holding Period: ${m.avgHoldingPeriod.toFixed(2)} days`,
    "",
    "## Streaks",
    `Max Consecutive Wins: ${maxConsecWins}, Max Consecutive Losses: ${maxConsecLosses}`,
    "",
    "## Direction Breakdown",
    `Longs: ${longs.length} trades, $${longPnl.toFixed(2)} total PnL`,
    `Shorts: ${shorts.length} trades, $${shortPnl.toFixed(2)} total PnL`,
    "",
    "## Instruments",
    instrSummary,
    "",
    "## Day-of-Week Performance",
    dowSummary,
    "",
    "## Top Hours by Avg PnL",
    topHours,
    "",
    "## Recent Monthly Returns",
    recentMonthly,
  ];

  if (strategy.parameters && Object.keys(strategy.parameters).length > 0) {
    lines.push("", "## Strategy Parameters");
    for (const [k, v] of Object.entries(strategy.parameters)) {
      lines.push(`${k}: ${JSON.stringify(v)}`);
    }
  }

  return lines.join("\n");
}

/**
 * Build a compact inventory of ALL strategies and portfolios the user owns.
 * Sent as global context so the AI can reference any by name.
 */
export function buildGlobalContext(
  strategies: Strategy[],
  portfolios: PortfolioRow[],
  portfolioMemberships?: Record<string, { strategyId: string; weight: number }[]>
): string {
  if (!strategies.length && !portfolios.length) return "";

  const lines: string[] = ["# User's Complete Inventory", ""];

  // Strategy inventory — one line each
  if (strategies.length) {
    lines.push(`## Strategies (${strategies.length} total)`, "");
    for (const s of strategies) {
      const trades = s.trades;
      const totalPnl = trades.reduce((sum, t) => sum + t.pnlNet, 0);
      const winCount = trades.filter(t => t.pnlNet > 0).length;
      const winRate = trades.length ? ((winCount / trades.length) * 100).toFixed(1) : "0.0";

      let sharpe = "N/A";
      try {
        if (trades.length >= 2 && s.equityCurve.length >= 2) {
          const m = calculateMetrics(trades, s.equityCurve);
          sharpe = m.sharpeRatio.toFixed(2);
        }
      } catch {}

      lines.push(
        `- **${s.name}** [${s.status}]: ${trades.length} trades, PnL $${totalPnl.toFixed(2)}, WR ${winRate}%, Sharpe ${sharpe}, ${s.assetClass || "N/A"} ${s.timeframe || ""}`
      );
    }
  }

  // Portfolio inventory
  if (portfolios.length) {
    lines.push("", `## Portfolios (${portfolios.length} total)`, "");
    for (const p of portfolios) {
      const members = portfolioMemberships?.[p.id];
      if (members?.length) {
        const memberNames = members
          .map(m => {
            const strat = strategies.find(s => s.id === m.strategyId);
            return strat ? `${strat.name} (${m.weight}%)` : `unknown (${m.weight}%)`;
          })
          .join(", ");
        lines.push(`- **${p.name}**: ${members.length} strategies — ${memberNames}`);
      } else {
        lines.push(`- **${p.name}**: ${p.strategyCount} strategies`);
      }
    }
  }

  return lines.join("\n");
}

/**
 * Build detailed context for a portfolio — aggregates trades from member strategies.
 */
export function buildPortfolioContext(
  portfolioName: string,
  memberStrategies: { strategy: Strategy; weight: number }[]
): string {
  if (!memberStrategies.length) return `Portfolio "${portfolioName}" has no strategies.`;

  const allTrades = memberStrategies.flatMap(ms => ms.strategy.trades);
  if (!allTrades.length) return `Portfolio "${portfolioName}" has strategies but no trades yet.`;

  const totalPnl = allTrades.reduce((s, t) => s + t.pnlNet, 0);
  const wins = allTrades.filter(t => t.pnlNet > 0);
  const losses = allTrades.filter(t => t.pnlNet < 0);
  const winRate = allTrades.length ? ((wins.length / allTrades.length) * 100).toFixed(1) : "0.0";
  const avgWin = wins.length ? (wins.reduce((s, t) => s + t.pnlNet, 0) / wins.length).toFixed(2) : "0.00";
  const avgLoss = losses.length ? (losses.reduce((s, t) => s + t.pnlNet, 0) / losses.length).toFixed(2) : "0.00";

  const lines = [
    `# Portfolio: ${portfolioName}`,
    "",
    "## Composition",
  ];

  for (const ms of memberStrategies) {
    const sPnl = ms.strategy.trades.reduce((s, t) => s + t.pnlNet, 0);
    lines.push(`- ${ms.strategy.name}: weight ${ms.weight}%, ${ms.strategy.trades.length} trades, PnL $${sPnl.toFixed(2)}`);
  }

  lines.push(
    "",
    "## Aggregate Metrics",
    `Total Trades: ${allTrades.length}`,
    `Total PnL: $${totalPnl.toFixed(2)}`,
    `Win Rate: ${winRate}%`,
    `Avg Win: $${avgWin}, Avg Loss: $${avgLoss}`,
  );

  // Instrument breakdown across portfolio
  const instrPnl: Record<string, { n: number; pnl: number }> = {};
  for (const t of allTrades) {
    const e = (instrPnl[t.instrument] ??= { n: 0, pnl: 0 });
    e.n++; e.pnl += t.pnlNet;
  }
  const instrSummary = Object.entries(instrPnl)
    .sort((a, b) => b[1].pnl - a[1].pnl)
    .slice(0, 10)
    .map(([i, d]) => `${i}: ${d.n} trades, $${d.pnl.toFixed(2)}`)
    .join("; ");
  lines.push("", "## Instruments", instrSummary);

  return lines.join("\n");
}
