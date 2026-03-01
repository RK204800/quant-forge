import { useParams, Link } from "react-router-dom";
import { useStrategy } from "@/hooks/use-strategies";
import { calculateMetrics, getMonthlyReturns } from "@/lib/analytics";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { MonthlyHeatmap } from "@/components/dashboard/MonthlyHeatmap";
import { TradeDistribution } from "@/components/dashboard/TradeDistribution";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft } from "lucide-react";

const StrategyDetail = () => {
  const { id } = useParams();
  const { data: strategy, isLoading } = useStrategy(id);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!strategy) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-mono">Strategy not found</p>
      </div>
    );
  }

  const metrics = calculateMetrics(strategy.trades, strategy.equityCurve);
  const monthlyReturns = getMonthlyReturns(strategy.equityCurve);

  return (
    <div className="space-y-6">
      <div>
        <Link to="/strategies" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Strategies
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono tracking-tight">{strategy.name}</h1>
          <Badge variant={strategy.status === "active" ? "default" : "secondary"}>{strategy.status}</Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span>{strategy.assetClass}</span>·<span>{strategy.timeframe}</span>·<span>{strategy.backtestEngine}</span>·<span>{strategy.broker}</span>
        </div>
      </div>

      <MetricsGrid metrics={metrics} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <EquityCurve data={strategy.equityCurve} />
        <TradeDistribution trades={strategy.trades} />
      </div>

      <MonthlyHeatmap data={monthlyReturns} />
      <TradesTable trades={strategy.trades} />
    </div>
  );
};

export default StrategyDetail;
