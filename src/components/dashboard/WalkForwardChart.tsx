import { useMemo } from "react";
import { Trade, EquityPoint } from "@/types";
import { walkForwardAnalysis } from "@/lib/robustness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface WalkForwardChartProps {
  trades: Trade[];
  equityCurve: EquityPoint[];
  segments?: number;
}

export function WalkForwardChart({ trades, equityCurve, segments = 5 }: WalkForwardChartProps) {
  const results = useMemo(() => walkForwardAnalysis(trades, equityCurve, segments), [trades, equityCurve, segments]);

  if (!results.length) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Walk-Forward Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not enough trades for walk-forward analysis (need {segments * 2}+)</p>
        </CardContent>
      </Card>
    );
  }

  const chartData = results.map((s) => ({
    segment: `Seg ${s.segmentIndex + 1}`,
    totalReturn: s.totalReturn,
    sharpe: s.sharpe,
    winRate: s.winRate,
    profitFactor: Math.min(s.profitFactor, 10),
    tradeCount: s.tradeCount,
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Walk-Forward Analysis ({segments} segments)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="segment" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="ret" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <YAxis yAxisId="sr" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} />
              <Bar yAxisId="ret" dataKey="totalReturn" radius={[4, 4, 0, 0]} name="Return">
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.totalReturn >= 0 ? "hsl(142 70% 45% / 0.7)" : "hsl(0 72% 51% / 0.7)"} />
                ))}
              </Bar>
              <Line yAxisId="sr" type="monotone" dataKey="sharpe" stroke="hsl(38 92% 50%)" strokeWidth={2} dot name="Sharpe" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <Table className="mt-4">
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-mono">Segment</TableHead>
              <TableHead className="text-xs font-mono text-right">Trades</TableHead>
              <TableHead className="text-xs font-mono text-right">Return</TableHead>
              <TableHead className="text-xs font-mono text-right">Sharpe</TableHead>
              <TableHead className="text-xs font-mono text-right">Win Rate</TableHead>
              <TableHead className="text-xs font-mono text-right">PF</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d) => (
              <TableRow key={d.segment} className="text-xs font-mono">
                <TableCell className="py-1.5">{d.segment}</TableCell>
                <TableCell className="py-1.5 text-right">{d.tradeCount}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.totalReturn >= 0 ? "text-profit" : "text-loss"}`}>${d.totalReturn.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right">{d.sharpe.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right">{d.winRate.toFixed(1)}%</TableCell>
                <TableCell className="py-1.5 text-right">{d.profitFactor.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
