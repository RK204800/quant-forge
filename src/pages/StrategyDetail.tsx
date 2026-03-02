import { useParams, Link } from "react-router-dom";
import { useStrategy, useRecomputeEquity } from "@/hooks/use-strategies";
import { calculateMetrics, getMonthlyReturns } from "@/lib/analytics";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { MonthlyHeatmap } from "@/components/dashboard/MonthlyHeatmap";
import { TradeDistribution } from "@/components/dashboard/TradeDistribution";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { PeriodAnalysis } from "@/components/dashboard/PeriodAnalysis";
import { PerformanceSummary } from "@/components/dashboard/PerformanceSummary";
import { ExpectancyCurve } from "@/components/dashboard/ExpectancyCurve";
import { StreakAnalysis } from "@/components/dashboard/StreakAnalysis";
import { RollingSharpe } from "@/components/dashboard/RollingSharpe";
import { MonteCarloChart } from "@/components/dashboard/MonteCarloChart";
import { RROptimizer } from "@/components/dashboard/RROptimizer";
import { RobustnessScore } from "@/components/dashboard/RobustnessScore";
import { WalkForwardChart } from "@/components/dashboard/WalkForwardChart";
import { ParametersTable } from "@/components/dashboard/ParametersTable";
import { TradeChart } from "@/components/dashboard/TradeChart";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, RefreshCw, Briefcase } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AddToPortfolioDialog } from "@/components/portfolio/AddToPortfolioDialog";
import { useState } from "react";

const StrategyDetail = () => {
  const { id } = useParams();
  const { data: strategy, isLoading } = useStrategy(id);
  const recomputeEquity = useRecomputeEquity();
  const navigate = useNavigate();
  const [portfolioDialogOpen, setPortfolioDialogOpen] = useState(false);

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
  const instrument = strategy.trades.length > 0 ? strategy.trades[0].instrument : "UNKNOWN";
  const hasParameters = strategy.parameters && Object.keys(strategy.parameters).length > 0;

  return (
    <div className="space-y-6">
      <div>
        <Link to="/strategies" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Strategies
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold font-mono tracking-tight">{strategy.name}</h1>
          <Badge variant={strategy.status === "active" ? "default" : "secondary"}>{strategy.status}</Badge>
          {strategy.strategyClass && <Badge variant="outline">{strategy.strategyClass}</Badge>}
          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              onClick={() => setPortfolioDialogOpen(true)}
            >
              <Briefcase className="h-3 w-3" />
              Add to Portfolio
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="font-mono text-xs"
              disabled={recomputeEquity.isPending}
              onClick={() => recomputeEquity.mutate(strategy.id)}
            >
              <RefreshCw className={`h-3 w-3 ${recomputeEquity.isPending ? "animate-spin" : ""}`} />
              {recomputeEquity.isPending ? "Recomputing…" : "Recompute Equity"}
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mt-1">{strategy.description}</p>
        <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
          <span>{strategy.assetClass}</span>·<span>{strategy.timeframe}</span>·<span>{strategy.backtestEngine}</span>·<span>{strategy.broker}</span>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="bg-muted">
          <TabsTrigger value="overview" className="text-xs font-mono">Overview</TabsTrigger>
          <TabsTrigger value="analysis" className="text-xs font-mono">Analysis</TabsTrigger>
          <TabsTrigger value="performance" className="text-xs font-mono">Performance</TabsTrigger>
          <TabsTrigger value="robustness" className="text-xs font-mono">Robustness</TabsTrigger>
          <TabsTrigger value="tradechart" className="text-xs font-mono">Trade Chart</TabsTrigger>
          <TabsTrigger value="tradelog" className="text-xs font-mono">Trade Log</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4 mt-4">
          <MetricsGrid metrics={metrics} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EquityCurve data={strategy.equityCurve} />
            <TradeDistribution trades={strategy.trades} />
          </div>
          <MonthlyHeatmap data={monthlyReturns} />
          {hasParameters && <ParametersTable parameters={strategy.parameters!} />}
        </TabsContent>

        <TabsContent value="analysis" className="mt-4">
          <PeriodAnalysis trades={strategy.trades} />
        </TabsContent>

        <TabsContent value="performance" className="space-y-4 mt-4">
          <PerformanceSummary trades={strategy.trades} equityCurve={strategy.equityCurve} />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <ExpectancyCurve trades={strategy.trades} />
            <RollingSharpe trades={strategy.trades} />
          </div>
          <StreakAnalysis trades={strategy.trades} />
        </TabsContent>

        <TabsContent value="robustness" className="space-y-4 mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <MonteCarloChart trades={strategy.trades} />
            <RobustnessScore trades={strategy.trades} equityCurve={strategy.equityCurve} />
          </div>
          <RROptimizer trades={strategy.trades} />
          <WalkForwardChart trades={strategy.trades} equityCurve={strategy.equityCurve} />
        </TabsContent>

        <TabsContent value="tradechart" className="mt-4">
          <TradeChart trades={strategy.trades} instrument={instrument} />
        </TabsContent>

        <TabsContent value="tradelog" className="mt-4">
          <TradesTable trades={strategy.trades} />
        </TabsContent>
      </Tabs>

      <AddToPortfolioDialog
        open={portfolioDialogOpen}
        onOpenChange={setPortfolioDialogOpen}
        strategyIds={strategy ? [strategy.id] : []}
      />
    </div>
  );
};

export default StrategyDetail;
