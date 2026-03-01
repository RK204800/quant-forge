import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StrategyMetrics } from "@/types";
import { TrendingUp, TrendingDown, Activity, Target, BarChart3, Percent, Zap, Clock } from "lucide-react";

interface MetricsGridProps {
  metrics: StrategyMetrics;
}

interface MetricCardProps {
  label: string;
  value: string;
  icon: React.ReactNode;
  color?: string;
}

function MetricCard({ label, value, icon, color }: MetricCardProps) {
  return (
    <Card className="bg-card border-border">
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-lg font-mono font-bold ${color || "text-foreground"}`}>{value}</p>
          </div>
          <div className="text-muted-foreground">{icon}</div>
        </div>
      </CardContent>
    </Card>
  );
}

export function MetricsGrid({ metrics }: MetricsGridProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
      <MetricCard label="Total Return" value={`$${metrics.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<TrendingUp className="h-4 w-4" />} color={metrics.totalReturn >= 0 ? "text-profit" : "text-loss"} />
      <MetricCard label="Sharpe Ratio" value={metrics.sharpeRatio.toFixed(2)} icon={<Activity className="h-4 w-4" />} color={metrics.sharpeRatio >= 1 ? "text-profit" : metrics.sharpeRatio >= 0 ? "text-warning" : "text-loss"} />
      <MetricCard label="Sortino Ratio" value={metrics.sortinoRatio.toFixed(2)} icon={<Activity className="h-4 w-4" />} color={metrics.sortinoRatio >= 1.5 ? "text-profit" : "text-warning"} />
      <MetricCard label="Calmar Ratio" value={metrics.calmarRatio.toFixed(2)} icon={<BarChart3 className="h-4 w-4" />} />
      <MetricCard label="Max Drawdown" value={`-${metrics.maxDrawdown.toFixed(2)}%`} icon={<TrendingDown className="h-4 w-4" />} color="text-loss" />
      <MetricCard label="Win Rate" value={`${metrics.winRate.toFixed(1)}%`} icon={<Target className="h-4 w-4" />} color={metrics.winRate >= 50 ? "text-profit" : "text-loss"} />
      <MetricCard label="Profit Factor" value={metrics.profitFactor === Infinity ? "∞" : metrics.profitFactor.toFixed(2)} icon={<Percent className="h-4 w-4" />} color={metrics.profitFactor >= 1.5 ? "text-profit" : "text-warning"} />
      <MetricCard label="Expectancy" value={`$${metrics.expectancy.toFixed(2)}`} icon={<Zap className="h-4 w-4" />} color={metrics.expectancy >= 0 ? "text-profit" : "text-loss"} />
      <MetricCard label="Total Trades" value={metrics.totalTrades.toString()} icon={<BarChart3 className="h-4 w-4" />} />
      <MetricCard label="Avg Hold (days)" value={metrics.avgHoldingPeriod.toFixed(1)} icon={<Clock className="h-4 w-4" />} />
    </div>
  );
}
