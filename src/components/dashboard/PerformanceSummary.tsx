import { Trade, EquityPoint, ExtendedMetrics } from "@/types";
import { calculateMetricsByDirection } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

interface PerformanceSummaryProps {
  trades: Trade[];
  equityCurve: EquityPoint[];
}

function formatVal(val: number, fmt: "dollar" | "pct" | "ratio" | "int" | "days" = "dollar"): string {
  if (!isFinite(val)) return "∞";
  switch (fmt) {
    case "dollar": return `$${val.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    case "pct": return `${val.toFixed(2)}%`;
    case "ratio": return val.toFixed(2);
    case "int": return val.toFixed(0);
    case "days": return `${val.toFixed(0)}d`;
  }
}

function formatDate(d: string): string {
  if (!d) return "—";
  try { return format(new Date(d), "MMM dd, yyyy"); } catch { return "—"; }
}

interface MetricRow {
  label: string;
  all: string;
  long: string;
  short: string;
  colorFn?: (v: number) => string;
}

function getColor(v: number): string {
  return v >= 0 ? "text-profit" : "text-loss";
}

export function PerformanceSummary({ trades, equityCurve }: PerformanceSummaryProps) {
  const m = calculateMetricsByDirection(trades, equityCurve);

  const rows: MetricRow[] = [
    { label: "Total Net Profit", all: formatVal(m.all.totalReturn), long: formatVal(m.long.totalReturn), short: formatVal(m.short.totalReturn) },
    { label: "Gross Profit", all: formatVal(m.all.grossProfit), long: formatVal(m.long.grossProfit), short: formatVal(m.short.grossProfit) },
    { label: "Gross Loss", all: formatVal(-m.all.grossLoss), long: formatVal(-m.long.grossLoss), short: formatVal(-m.short.grossLoss) },
    { label: "Profit Factor", all: formatVal(m.all.profitFactor, "ratio"), long: formatVal(m.long.profitFactor, "ratio"), short: formatVal(m.short.profitFactor, "ratio") },
    { label: "Total Commission", all: formatVal(m.all.totalCommission), long: formatVal(m.long.totalCommission), short: formatVal(m.short.totalCommission) },
    { label: "Max Drawdown", all: formatVal(m.all.maxDrawdown, "pct"), long: formatVal(m.long.maxDrawdown, "pct"), short: formatVal(m.short.maxDrawdown, "pct") },
    { label: "Sharpe Ratio", all: formatVal(m.all.sharpeRatio, "ratio"), long: formatVal(m.long.sharpeRatio, "ratio"), short: formatVal(m.short.sharpeRatio, "ratio") },
    { label: "Sortino Ratio", all: formatVal(m.all.sortinoRatio, "ratio"), long: formatVal(m.long.sortinoRatio, "ratio"), short: formatVal(m.short.sortinoRatio, "ratio") },
    { label: "Calmar Ratio", all: formatVal(m.all.calmarRatio, "ratio"), long: formatVal(m.long.calmarRatio, "ratio"), short: formatVal(m.short.calmarRatio, "ratio") },
    { label: "Total Trades", all: formatVal(m.all.totalTrades, "int"), long: formatVal(m.long.totalTrades, "int"), short: formatVal(m.short.totalTrades, "int") },
    { label: "Win Rate", all: formatVal(m.all.winRate, "pct"), long: formatVal(m.long.winRate, "pct"), short: formatVal(m.short.winRate, "pct") },
    { label: "Winning Trades", all: formatVal(m.all.winningTrades, "int"), long: formatVal(m.long.winningTrades, "int"), short: formatVal(m.short.winningTrades, "int") },
    { label: "Losing Trades", all: formatVal(m.all.losingTrades, "int"), long: formatVal(m.long.losingTrades, "int"), short: formatVal(m.short.losingTrades, "int") },
    { label: "Avg Trade", all: formatVal(m.all.expectancy), long: formatVal(m.long.expectancy), short: formatVal(m.short.expectancy) },
    { label: "Avg Winner", all: formatVal(m.all.avgWin), long: formatVal(m.long.avgWin), short: formatVal(m.short.avgWin) },
    { label: "Avg Loser", all: formatVal(-m.all.avgLoss), long: formatVal(-m.long.avgLoss), short: formatVal(-m.short.avgLoss) },
    { label: "Win/Loss Ratio", all: formatVal(m.all.avgWinLossRatio, "ratio"), long: formatVal(m.long.avgWinLossRatio, "ratio"), short: formatVal(m.short.avgWinLossRatio, "ratio") },
    { label: "Max Consec. Winners", all: formatVal(m.all.maxConsecWins, "int"), long: formatVal(m.long.maxConsecWins, "int"), short: formatVal(m.short.maxConsecWins, "int") },
    { label: "Max Consec. Losers", all: formatVal(m.all.maxConsecLosses, "int"), long: formatVal(m.long.maxConsecLosses, "int"), short: formatVal(m.short.maxConsecLosses, "int") },
    { label: "Best Trade", all: formatVal(m.all.bestTrade), long: formatVal(m.long.bestTrade), short: formatVal(m.short.bestTrade) },
    { label: "Worst Trade", all: formatVal(m.all.worstTrade), long: formatVal(m.long.worstTrade), short: formatVal(m.short.worstTrade) },
    { label: "Avg Trades/Day", all: formatVal(m.all.avgTradesPerDay, "ratio"), long: formatVal(m.long.avgTradesPerDay, "ratio"), short: formatVal(m.short.avgTradesPerDay, "ratio") },
    { label: "Avg Hold (days)", all: formatVal(m.all.avgHoldingPeriod, "ratio"), long: formatVal(m.long.avgHoldingPeriod, "ratio"), short: formatVal(m.short.avgHoldingPeriod, "ratio") },
    { label: "Profit/Month", all: formatVal(m.all.profitPerMonth), long: formatVal(m.long.profitPerMonth), short: formatVal(m.short.profitPerMonth) },
    { label: "Max Recovery", all: formatVal(m.all.maxRecoveryDays, "days"), long: formatVal(m.long.maxRecoveryDays, "days"), short: formatVal(m.short.maxRecoveryDays, "days") },
    { label: "Start Date", all: formatDate(m.all.startDate), long: formatDate(m.long.startDate), short: formatDate(m.short.startDate) },
    { label: "End Date", all: formatDate(m.all.endDate), long: formatDate(m.long.endDate), short: formatDate(m.short.endDate) },
  ];

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Performance Summary</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border">
                <TableHead className="text-xs font-mono w-[200px]">Metric</TableHead>
                <TableHead className="text-xs font-mono text-right">All Trades</TableHead>
                <TableHead className="text-xs font-mono text-right">Long</TableHead>
                <TableHead className="text-xs font-mono text-right">Short</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => (
                <TableRow key={row.label} className="text-xs font-mono hover:bg-accent/50">
                  <TableCell className="py-1.5 text-muted-foreground">{row.label}</TableCell>
                  <TableCell className="py-1.5 text-right">{row.all}</TableCell>
                  <TableCell className="py-1.5 text-right">{row.long}</TableCell>
                  <TableCell className="py-1.5 text-right">{row.short}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
