import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { useState, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { EquityPoint } from "@/types";

const Portfolio = () => {
  const { data: allStrategies = [], isLoading } = useStrategies();
  const [searchParams] = useSearchParams();
  const idsParam = searchParams.get("ids");

  const strategies = useMemo(() => {
    if (!idsParam) return allStrategies;
    const ids = idsParam.split(",").filter(Boolean);
    return allStrategies.filter((s) => ids.includes(s.id));
  }, [allStrategies, idsParam]);

  const [weights, setWeights] = useState<Record<string, number>>({});

  // Initialize weights when strategies load
  const effectiveWeights = useMemo(() => {
    if (!strategies.length) return {};
    const initial = Object.fromEntries(strategies.map((s) => [s.id, Math.round(100 / strategies.length)]));
    // Merge with any user-set weights
    return strategies.reduce((acc, s) => {
      acc[s.id] = weights[s.id] ?? initial[s.id] ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }, [strategies, weights]);

  const updateWeight = (id: string, val: number) => {
    setWeights((prev) => ({ ...prev, [id]: val }));
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!strategies.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Portfolio Builder</h1>
          <p className="text-sm text-muted-foreground">Select strategies from the Strategies page to build a portfolio</p>
        </div>
      </div>
    );
  }

  // Simple combined equity curve (weighted)
  const totalWeight = Object.values(effectiveWeights).reduce((a, b) => a + b, 0) || 1;
  const maxLen = Math.max(...strategies.map((s) => s.equityCurve.length));
  const combinedCurve: EquityPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    let equity = 0;
    let timestamp = "";
    strategies.forEach((s) => {
      const w = (effectiveWeights[s.id] || 0) / totalWeight;
      const point = s.equityCurve[Math.min(i, s.equityCurve.length - 1)];
      if (point) {
        equity += point.equity * w;
        if (!timestamp) timestamp = point.timestamp;
      }
    });
    const peak = Math.max(equity, ...combinedCurve.map((c) => c.equity), equity);
    combinedCurve.push({ timestamp, equity: +equity.toFixed(2), drawdown: +((peak - equity) / peak).toFixed(4) });
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Portfolio Builder</h1>
        <p className="text-sm text-muted-foreground">Combine strategies with custom allocation weights</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => {
          const m = calculateMetrics(s.trades, s.equityCurve);
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <span className="text-sm font-mono font-bold text-primary">{effectiveWeights[s.id] ?? 0}%</span>
                </div>
                <Slider value={[effectiveWeights[s.id] ?? 0]} onValueChange={([v]) => updateWeight(s.id, v)} max={100} step={5} />
                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div>
                    <span className="text-muted-foreground">Return</span>
                    <p className={m.totalReturn >= 0 ? "text-profit" : "text-loss"}>${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Sharpe</span>
                    <p>{m.sharpeRatio.toFixed(2)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <EquityCurve data={combinedCurve} title="Combined Portfolio Equity" />
    </div>
  );
};

export default Portfolio;
