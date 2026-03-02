import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { MonteCarloChart } from "@/components/dashboard/MonteCarloChart";
import {
  StrategyWithWeight,
  calculateKelly,
  calculateMAEStressTest,
  calculatePortfolioHeat,
  calculateDiversification,
  calculateTailRisk,
  calculateConcentration,
  runPortfolioMonteCarlo,
  calculatePortfolioScore,
} from "@/lib/portfolio-analytics";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { Shield, AlertTriangle, TrendingUp, Target, Activity, BarChart3 } from "lucide-react";

interface Props {
  strategies: StrategyWithWeight[];
}

function fmt$(v: number, compact = false): string {
  if (compact) return `$${(v / 1000).toFixed(1)}k`;
  return `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`;
}

function ScoreRing({ score, grade }: { score: number; grade: string }) {
  const r = 40;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  const color = score >= 70 ? "hsl(var(--profit))" : score >= 45 ? "hsl(var(--warning))" : "hsl(var(--loss))";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width="100" height="100" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="hsl(var(--border))" strokeWidth="6" />
        <circle
          cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6"
          strokeDasharray={circ} strokeDashoffset={offset}
          strokeLinecap="round" transform="rotate(-90 50 50)"
          className="transition-all duration-700"
        />
        <text x="50" y="46" textAnchor="middle" className="fill-foreground font-mono text-lg font-bold" fontSize="18">
          {grade}
        </text>
        <text x="50" y="62" textAnchor="middle" className="fill-muted-foreground font-mono" fontSize="11">
          {score}/100
        </text>
      </svg>
    </div>
  );
}

function HeatIndicator({ status, pct }: { status: "green" | "yellow" | "red"; pct: number }) {
  const colors = { green: "bg-profit", yellow: "bg-warning", red: "bg-loss" };
  const labels = { green: "LOW RISK", yellow: "MODERATE", red: "HIGH RISK" };
  return (
    <div className="flex items-center gap-2">
      <div className={`w-2.5 h-2.5 rounded-full ${colors[status]}`} />
      <span className="text-xs font-mono">{labels[status]} ({pct.toFixed(1)}%)</span>
    </div>
  );
}

export function PortfolioRiskAssessment({ strategies }: Props) {
  const [accountSize, setAccountSize] = useState(100000);

  const analytics = useMemo(() => {
    const kelly = calculateKelly(strategies);
    const stressTest = calculateMAEStressTest(strategies, accountSize);
    const heat = calculatePortfolioHeat(stressTest, accountSize);
    const diversification = calculateDiversification(strategies);
    const tailRisk = calculateTailRisk(strategies);
    const concentration = calculateConcentration(strategies);
    const monteCarlo = runPortfolioMonteCarlo(strategies, accountSize);
    const score = calculatePortfolioScore(diversification, kelly, stressTest, tailRisk, accountSize);

    return { kelly, stressTest, heat, diversification, tailRisk, concentration, monteCarlo, score };
  }, [strategies, accountSize]);

  const { kelly, stressTest, heat, diversification, tailRisk, concentration, monteCarlo, score } = analytics;

  // Monte Carlo chart data
  const mcChartData = useMemo(() => {
    if (!monteCarlo?.equityPaths.length) return [];
    const numSteps = monteCarlo.equityPaths[0]?.length || 0;
    const data = [];
    for (let i = 0; i < numSteps; i += Math.max(1, Math.floor(numSteps / 100))) {
      const values = monteCarlo.equityPaths.map((p) => p[i]).sort((a, b) => a - b);
      const pct = (p: number) => values[Math.floor(values.length * p)] || 0;
      data.push({ trade: i, p5: pct(0.05), p25: pct(0.25), p50: pct(0.5), p75: pct(0.75), p95: pct(0.95) });
    }
    return data;
  }, [monteCarlo]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Portfolio Risk Assessment
              </CardTitle>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground">
              <span>Account Size:</span>
              <Input
                type="number"
                value={accountSize}
                onChange={(e) => setAccountSize(Number(e.target.value) || 100000)}
                className="h-7 w-28 text-xs font-mono"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-8">
            <ScoreRing score={score.overall} grade={score.grade} />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-1">
              <div>
                <p className="text-xs text-muted-foreground font-mono">DIVERSIFICATION</p>
                <p className="text-lg font-bold font-mono">{score.diversificationScore.toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">KELLY ALIGNMENT</p>
                <p className="text-lg font-bold font-mono">{score.kellyAlignmentScore.toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">DD RESILIENCE</p>
                <p className="text-lg font-bold font-mono">{score.drawdownResilienceScore.toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground font-mono">TAIL RISK</p>
                <p className="text-lg font-bold font-mono">{score.tailRiskScore.toFixed(0)}<span className="text-xs text-muted-foreground">/100</span></p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Target className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-mono">KELLY OPTIMAL</p>
            </div>
            <p className="text-lg font-bold font-mono">
              {kelly.length > 0 ? `${kelly.reduce((a, k) => a + k.halfKelly, 0).toFixed(1)}%` : "N/A"}
            </p>
            <p className="text-xs text-muted-foreground font-mono">Half-Kelly Sum</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1">
              <AlertTriangle className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-mono">WORST-CASE DD</p>
            </div>
            <p className="text-lg font-bold font-mono text-loss">{fmt$(stressTest.totalWeighted)}</p>
            <p className="text-xs text-muted-foreground font-mono">{stressTest.pctOfCapital.toFixed(1)}% of capital</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Activity className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-mono">VaR 95%</p>
            </div>
            <p className="text-lg font-bold font-mono text-loss">{fmt$(Math.abs(tailRisk.var95))}</p>
            <p className="text-xs text-muted-foreground font-mono">Daily worst 5%</p>
          </CardContent>
        </Card>
        <Card className="bg-card border-border">
          <CardContent className="pt-4 pb-3 px-4">
            <div className="flex items-center gap-1.5 mb-1">
              <TrendingUp className="h-3 w-3 text-muted-foreground" />
              <p className="text-xs text-muted-foreground font-mono">PORTFOLIO HEAT</p>
            </div>
            <HeatIndicator status={heat.status} pct={heat.heatPct} />
            <p className="text-xs text-muted-foreground font-mono mt-1">Budget: {heat.riskBudgetUsed.toFixed(0)}% used</p>
          </CardContent>
        </Card>
      </div>

      {/* Kelly Position Sizing */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Target className="h-3.5 w-3.5" /> Kelly Criterion Position Sizing
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-mono">Strategy</TableHead>
                <TableHead className="text-xs font-mono text-center">Win Rate</TableHead>
                <TableHead className="text-xs font-mono text-center">R:R</TableHead>
                <TableHead className="text-xs font-mono text-center">Full Kelly</TableHead>
                <TableHead className="text-xs font-mono text-center">Half Kelly</TableHead>
                <TableHead className="text-xs font-mono text-center">Current %</TableHead>
                <TableHead className="text-xs font-mono text-center">Delta</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {kelly.map((k) => (
                <TableRow key={k.strategyId}>
                  <TableCell className="text-xs font-mono">{k.strategyName}</TableCell>
                  <TableCell className="text-xs font-mono text-center">{(k.winRate * 100).toFixed(1)}%</TableCell>
                  <TableCell className="text-xs font-mono text-center">{k.rewardToRisk.toFixed(2)}</TableCell>
                  <TableCell className="text-xs font-mono text-center">{k.kellyFraction.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs font-mono text-center font-bold">{k.halfKelly.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs font-mono text-center">{k.currentWeight.toFixed(1)}%</TableCell>
                  <TableCell className={`text-xs font-mono text-center ${k.kellyDelta > 10 ? "text-loss" : k.kellyDelta < -10 ? "text-info" : ""}`}>
                    {k.kellyDelta > 0 ? "+" : ""}{k.kellyDelta.toFixed(1)}%
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* MAE Stress Test */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5" /> Concurrent MAE Stress Test
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground mb-3">
            Conservative worst-case: assumes all strategies hit maximum adverse excursion simultaneously.
          </p>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="text-xs font-mono">Strategy</TableHead>
                <TableHead className="text-xs font-mono text-right">Worst MAE</TableHead>
                <TableHead className="text-xs font-mono text-center">Weight</TableHead>
                <TableHead className="text-xs font-mono text-right">Weighted Contrib</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {stressTest.perStrategy.map((s) => (
                <TableRow key={s.strategyId}>
                  <TableCell className="text-xs font-mono">{s.strategyName}</TableCell>
                  <TableCell className="text-xs font-mono text-right text-loss">{fmt$(s.worstMAE)}</TableCell>
                  <TableCell className="text-xs font-mono text-center">{s.weight.toFixed(1)}%</TableCell>
                  <TableCell className="text-xs font-mono text-right text-loss">{fmt$(s.weightedContrib)}</TableCell>
                </TableRow>
              ))}
              <TableRow className="border-t-2 border-border">
                <TableCell className="text-xs font-mono font-bold">TOTAL</TableCell>
                <TableCell className="text-xs font-mono text-right font-bold text-loss">{fmt$(stressTest.totalUnweighted)}</TableCell>
                <TableCell className="text-xs font-mono text-center">—</TableCell>
                <TableCell className="text-xs font-mono text-right font-bold text-loss">{fmt$(stressTest.totalWeighted)}</TableCell>
              </TableRow>
            </TableBody>
          </Table>
          <div className="mt-3 flex items-center gap-4 text-xs font-mono">
            <span className="text-muted-foreground">Impact on {fmt$(accountSize)} account:</span>
            <span className="text-loss font-bold">{stressTest.pctOfCapital.toFixed(2)}%</span>
          </div>
        </CardContent>
      </Card>

      {/* Tail Risk */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Activity className="h-3.5 w-3.5" /> Tail Risk Analysis (VaR / CVaR)
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono">VaR 95%</p>
              <p className="text-sm font-bold font-mono text-loss">{fmt$(Math.abs(tailRisk.var95))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">CVaR 95%</p>
              <p className="text-sm font-bold font-mono text-loss">{fmt$(Math.abs(tailRisk.cvar95))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">VaR 99%</p>
              <p className="text-sm font-bold font-mono text-loss">{fmt$(Math.abs(tailRisk.var99))}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">CVaR 99%</p>
              <p className="text-sm font-bold font-mono text-loss">{fmt$(Math.abs(tailRisk.cvar99))}</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground mt-3 font-mono">
            Based on {tailRisk.dailyPnls.length} daily weighted PnL observations
          </p>
        </CardContent>
      </Card>

      {/* Concentration & Diversification */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <BarChart3 className="h-3.5 w-3.5" /> Concentration & Diversification
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <p className="text-xs text-muted-foreground font-mono">HHI</p>
              <p className="text-sm font-bold font-mono">{concentration.hhi.toFixed(3)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">DIV RATIO</p>
              <p className="text-sm font-bold font-mono">{diversification.ratio.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">DIV SCORE</p>
              <p className="text-sm font-bold font-mono">
                {diversification.score.toFixed(0)}/100{" "}
                <Badge variant="outline" className="text-[10px] ml-1">{diversification.label}</Badge>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-mono">MAX WEIGHT</p>
              <p className={`text-sm font-bold font-mono ${concentration.isConcentrated ? "text-loss" : ""}`}>
                {concentration.maxWeight.toFixed(1)}%
              </p>
              <p className="text-xs text-muted-foreground font-mono truncate">{concentration.maxWeightStrategy}</p>
            </div>
          </div>

          {concentration.instrumentOverlap.length > 0 && (
            <div>
              <p className="text-xs text-muted-foreground font-mono mb-2">INSTRUMENT OVERLAP</p>
              <div className="flex flex-wrap gap-2">
                {concentration.instrumentOverlap.map((o) => (
                  <Badge key={o.instrument} variant="outline" className="text-xs font-mono">
                    {o.instrument}: {o.strategies.join(", ")}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Portfolio Monte Carlo */}
      {monteCarlo && mcChartData.length > 0 && (
        <Card className="bg-card border-border">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
                Portfolio Monte Carlo
              </CardTitle>
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="text-xs font-mono">{monteCarlo.simulations} sims</Badge>
                <span className={`text-xs font-mono ${monteCarlo.riskOfRuin < 5 ? "text-profit" : monteCarlo.riskOfRuin < 20 ? "text-warning" : "text-loss"}`}>
                  Risk of Ruin: {monteCarlo.riskOfRuin.toFixed(1)}%
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-5 gap-2 mb-4 text-xs font-mono text-center">
              <div><span className="text-muted-foreground">P5</span><br /><span className="text-loss">{fmt$(monteCarlo.percentiles.p5, true)}</span></div>
              <div><span className="text-muted-foreground">P25</span><br />{fmt$(monteCarlo.percentiles.p25, true)}</div>
              <div><span className="text-muted-foreground">P50</span><br /><span className="font-bold">{fmt$(monteCarlo.percentiles.p50, true)}</span></div>
              <div><span className="text-muted-foreground">P75</span><br />{fmt$(monteCarlo.percentiles.p75, true)}</div>
              <div><span className="text-muted-foreground">P95</span><br /><span className="text-profit">{fmt$(monteCarlo.percentiles.p95, true)}</span></div>
            </div>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={mcChartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
                  <XAxis dataKey="trade" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Trade #", position: "insideBottom", offset: -5, fill: "hsl(215 15% 55%)", fontSize: 10 }} />
                  <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                  <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} />
                  <Area type="monotone" dataKey="p5" stroke="none" fill="hsl(0 72% 51% / 0.1)" />
                  <Area type="monotone" dataKey="p25" stroke="none" fill="hsl(38 92% 50% / 0.1)" />
                  <Area type="monotone" dataKey="p75" stroke="none" fill="hsl(142 70% 45% / 0.1)" />
                  <Area type="monotone" dataKey="p95" stroke="none" fill="hsl(142 70% 45% / 0.05)" />
                  <Area type="monotone" dataKey="p50" stroke="hsl(217 91% 60%)" strokeWidth={2} fill="none" dot={false} />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-5 gap-2 mt-3 text-xs font-mono text-center">
              <div><span className="text-muted-foreground">DD P5</span><br />{monteCarlo.maxDrawdownPercentiles.p5.toFixed(1)}%</div>
              <div><span className="text-muted-foreground">DD P25</span><br />{monteCarlo.maxDrawdownPercentiles.p25.toFixed(1)}%</div>
              <div><span className="text-muted-foreground">DD P50</span><br /><span className="font-bold">{monteCarlo.maxDrawdownPercentiles.p50.toFixed(1)}%</span></div>
              <div><span className="text-muted-foreground">DD P75</span><br />{monteCarlo.maxDrawdownPercentiles.p75.toFixed(1)}%</div>
              <div><span className="text-muted-foreground">DD P95</span><br /><span className="text-loss">{monteCarlo.maxDrawdownPercentiles.p95.toFixed(1)}%</span></div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
