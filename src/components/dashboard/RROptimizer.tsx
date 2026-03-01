import { useMemo } from "react";
import { Trade } from "@/types";
import { optimizeRR, hasMAEData } from "@/lib/rr-optimizer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Line, ComposedChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { AlertCircle } from "lucide-react";

interface RROptimizerProps {
  trades: Trade[];
}

export function RROptimizer({ trades }: RROptimizerProps) {
  const results = useMemo(() => optimizeRR(trades), [trades]);
  const hasMAE = hasMAEData(trades);

  if (!results.length) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">R:R Optimizer</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not enough trade data for R:R optimization</p>
        </CardContent>
      </Card>
    );
  }

  const bestByExpectancy = results.reduce((best, r) => r.expectancy > best.expectancy ? r : best, results[0]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">R:R Optimizer</CardTitle>
          <div className="flex items-center gap-2">
            {!hasMAE && (
              <Badge variant="outline" className="text-xs font-mono text-warning border-warning/30">
                <AlertCircle className="h-3 w-3 mr-1" /> Estimated MAE
              </Badge>
            )}
            <Badge variant="outline" className="text-xs font-mono text-profit">
              Best: {bestByExpectancy.label}
            </Badge>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {!hasMAE && (
          <p className="text-xs text-muted-foreground mb-3">
            MAE/MFE data not available — using estimates. For accurate results, use NinjaTrader exports with MAE/MFE columns.
          </p>
        )}
        <div className="h-[280px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={results}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="label" tick={{ fill: "hsl(215 15% 55%)", fontSize: 9 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="pf" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis yAxisId="exp" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} />
              <Bar yAxisId="pf" dataKey="profitFactor" fill="hsl(217 91% 60% / 0.6)" radius={[2, 2, 0, 0]} name="Profit Factor" />
              <Line yAxisId="exp" type="monotone" dataKey="expectancy" stroke="hsl(142 70% 45%)" strokeWidth={2} dot={false} name="Expectancy" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
        <ScrollArea className="h-[200px] mt-4">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="text-xs font-mono">R:R</TableHead>
                <TableHead className="text-xs font-mono text-right">Win Rate</TableHead>
                <TableHead className="text-xs font-mono text-right">PF</TableHead>
                <TableHead className="text-xs font-mono text-right">Expectancy</TableHead>
                <TableHead className="text-xs font-mono text-right">Total Return</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {results.map((r) => (
                <TableRow key={r.label} className={`text-xs font-mono ${r.label === bestByExpectancy.label ? "bg-profit/10" : ""}`}>
                  <TableCell className="py-1.5">{r.label}</TableCell>
                  <TableCell className="py-1.5 text-right">{r.projectedWinRate.toFixed(1)}%</TableCell>
                  <TableCell className="py-1.5 text-right">{r.profitFactor.toFixed(2)}</TableCell>
                  <TableCell className={`py-1.5 text-right ${r.expectancy >= 0 ? "text-profit" : "text-loss"}`}>${r.expectancy.toFixed(2)}</TableCell>
                  <TableCell className={`py-1.5 text-right ${r.totalReturn >= 0 ? "text-profit" : "text-loss"}`}>${r.totalReturn.toFixed(2)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
