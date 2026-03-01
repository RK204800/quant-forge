import { mockStrategies } from "@/lib/mock-data";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { useState } from "react";
import { EquityPoint } from "@/types";

const Portfolio = () => {
  const [weights, setWeights] = useState<Record<string, number>>(
    Object.fromEntries(mockStrategies.map((s) => [s.id, Math.round(100 / mockStrategies.length)]))
  );

  const updateWeight = (id: string, val: number) => {
    setWeights((prev) => ({ ...prev, [id]: val }));
  };

  // Simple combined equity curve (weighted)
  const totalWeight = Object.values(weights).reduce((a, b) => a + b, 0) || 1;
  const maxLen = Math.max(...mockStrategies.map((s) => s.equityCurve.length));
  const combinedCurve: EquityPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    let equity = 0;
    let timestamp = "";
    mockStrategies.forEach((s) => {
      const w = (weights[s.id] || 0) / totalWeight;
      const point = s.equityCurve[Math.min(i, s.equityCurve.length - 1)];
      equity += point.equity * w;
      if (!timestamp) timestamp = point.timestamp;
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
        {mockStrategies.map((s) => {
          const m = calculateMetrics(s.trades, s.equityCurve);
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <span className="text-sm font-mono font-bold text-primary">{weights[s.id]}%</span>
                </div>
                <Slider value={[weights[s.id]]} onValueChange={([v]) => updateWeight(s.id, v)} max={100} step={5} />
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
