import { useMemo, useState } from "react";
import { Trade } from "@/types";
import { runMonteCarlo } from "@/lib/monte-carlo";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { Badge } from "@/components/ui/badge";

interface MonteCarloChartProps {
  trades: Trade[];
  startingEquity?: number;
}

export function MonteCarloChart({ trades, startingEquity = 100000 }: MonteCarloChartProps) {
  const result = useMemo(() => {
    if (trades.length < 5) return null;
    return runMonteCarlo(trades.map((t) => t.pnlNet), startingEquity, 500);
  }, [trades, startingEquity]);

  if (!result || !result.equityPaths.length) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monte Carlo Simulation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Need at least 5 trades to run Monte Carlo simulation</p>
        </CardContent>
      </Card>
    );
  }

  // Build percentile bands from equity paths
  const numSteps = result.equityPaths[0]?.length || 0;
  const chartData = [];
  for (let i = 0; i < numSteps; i += Math.max(1, Math.floor(numSteps / 100))) {
    const values = result.equityPaths.map((p) => p[i]).sort((a, b) => a - b);
    const pct = (p: number) => values[Math.floor(values.length * p)] || 0;
    chartData.push({
      trade: i,
      p5: pct(0.05),
      p25: pct(0.25),
      p50: pct(0.5),
      p75: pct(0.75),
      p95: pct(0.95),
    });
  }

  const ruinColor = result.riskOfRuin < 5 ? "text-profit" : result.riskOfRuin < 20 ? "text-warning" : "text-loss";

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monte Carlo Simulation</CardTitle>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className="text-xs font-mono">
              {result.simulations} sims
            </Badge>
            <div className="text-xs font-mono">
              Risk of Ruin: <span className={ruinColor}>{result.riskOfRuin.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-5 gap-2 mb-4 text-xs font-mono text-center">
          <div><span className="text-muted-foreground">P5</span><br /><span className="text-loss">${(result.percentiles.p5 / 1000).toFixed(1)}k</span></div>
          <div><span className="text-muted-foreground">P25</span><br />${(result.percentiles.p25 / 1000).toFixed(1)}k</div>
          <div><span className="text-muted-foreground">P50</span><br /><span className="font-bold">${(result.percentiles.p50 / 1000).toFixed(1)}k</span></div>
          <div><span className="text-muted-foreground">P75</span><br />${(result.percentiles.p75 / 1000).toFixed(1)}k</div>
          <div><span className="text-muted-foreground">P95</span><br /><span className="text-profit">${(result.percentiles.p95 / 1000).toFixed(1)}k</span></div>
        </div>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="trade" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Trade #", position: "insideBottom", offset: -5, fill: "hsl(215 15% 55%)", fontSize: 10 }} />
              <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} />
              <Area type="monotone" dataKey="p5" stroke="none" fill="hsl(0 72% 51% / 0.1)" />
              <Area type="monotone" dataKey="p25" stroke="none" fill="hsl(38 92% 50% / 0.1)" />
              <Area type="monotone" dataKey="p75" stroke="none" fill="hsl(142 70% 45% / 0.1)" />
              <Area type="monotone" dataKey="p95" stroke="none" fill="hsl(142 70% 45% / 0.05)" />
              <Area type="monotone" dataKey="p50" stroke="hsl(217 91% 60%)" strokeWidth={2} fill="none" dot={false} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
