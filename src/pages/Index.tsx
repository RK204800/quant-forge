import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics, getMonthlyReturns } from "@/lib/analytics";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { MonthlyHeatmap } from "@/components/dashboard/MonthlyHeatmap";
import { TradeDistribution } from "@/components/dashboard/TradeDistribution";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Plus } from "lucide-react";

const Index = () => {
  const { data: strategies = [], isLoading } = useStrategies();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your quantitative strategies</p>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground font-mono text-sm">No strategies yet. Upload your first backtest to get started.</p>
            <Link to="/strategies/upload">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Strategy</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const primaryStrategy = strategies[0];
  const metrics = calculateMetrics(primaryStrategy.trades, primaryStrategy.equityCurve);
  const monthlyReturns = getMonthlyReturns(primaryStrategy.equityCurve);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your quantitative strategies</p>
        </div>
        <div className="flex items-center gap-2">
          <Activity className="h-4 w-4 text-profit animate-pulse-glow" />
          <span className="text-xs font-mono text-muted-foreground">Live</span>
        </div>
      </div>

      {/* Strategy cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => {
          const m = calculateMetrics(s.trades, s.equityCurve);
          return (
            <Link to={`/strategies/${s.id}`} key={s.id}>
              <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                  </div>
                  <p className="text-xs text-muted-foreground">{s.assetClass} · {s.timeframe}</p>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div>
                      <span className="text-muted-foreground">Return</span>
                      <p className={m.totalReturn >= 0 ? "text-profit font-medium" : "text-loss font-medium"}>
                        ${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                      </p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Sharpe</span>
                      <p className="font-medium">{m.sharpeRatio.toFixed(2)}</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Win Rate</span>
                      <p className="font-medium">{m.winRate.toFixed(1)}%</p>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Max DD</span>
                      <p className="text-loss font-medium">${Math.abs(m.maxDrawdown).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Primary strategy deep-dive */}
      <div className="flex items-center gap-2">
        <h2 className="text-lg font-mono font-semibold">{primaryStrategy.name}</h2>
        <Link to={`/strategies/${primaryStrategy.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
          Details <ArrowRight className="h-3 w-3" />
        </Link>
      </div>

      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EquityCurve data={primaryStrategy.equityCurve} />
        <TradeDistribution trades={primaryStrategy.trades} />
      </div>

      <MonthlyHeatmap data={monthlyReturns} />
      <TradesTable trades={primaryStrategy.trades} />
    </div>
  );
};

export default Index;
