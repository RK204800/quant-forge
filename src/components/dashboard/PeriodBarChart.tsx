import { Trade } from "@/types";
import { groupByPeriod, summarizeGroup } from "@/lib/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";

interface PeriodBarChartProps {
  trades: Trade[];
  period: "daily" | "weekly" | "monthly";
}

export function PeriodBarChart({ trades, period }: PeriodBarChartProps) {
  const groups = groupByPeriod(trades, period);
  const sortedKeys = [...groups.keys()].sort();

  let cumPnl = 0;
  const chartData = sortedKeys.map((key) => {
    const summary = summarizeGroup(groups.get(key)!);
    cumPnl += summary.netProfit;
    return { label: key, ...summary, cumPnl };
  });

  return (
    <div className="space-y-4">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
            <XAxis dataKey="label" tick={{ fill: "hsl(215 15% 55%)", fontSize: 9 }} tickLine={false} axisLine={false} interval="preserveStartEnd" angle={-45} textAnchor="end" height={50} />
            <YAxis yAxisId="bar" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <YAxis yAxisId="line" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} />
            <Bar yAxisId="bar" dataKey="netProfit" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.netProfit >= 0 ? "hsl(142 70% 45% / 0.7)" : "hsl(0 72% 51% / 0.7)"} />
              ))}
            </Bar>
            <Line yAxisId="line" type="monotone" dataKey="cumPnl" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      <ScrollArea className="h-[200px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-mono">Period</TableHead>
              <TableHead className="text-xs font-mono text-right"># Trades</TableHead>
              <TableHead className="text-xs font-mono text-right">Net Profit</TableHead>
              <TableHead className="text-xs font-mono text-right">Cum. P&L</TableHead>
              <TableHead className="text-xs font-mono text-right">Win %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d) => (
              <TableRow key={d.label} className="text-xs font-mono">
                <TableCell className="py-1.5">{d.label}</TableCell>
                <TableCell className="py-1.5 text-right">{d.count}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.netProfit >= 0 ? "text-profit" : "text-loss"}`}>${d.netProfit.toFixed(2)}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.cumPnl >= 0 ? "text-profit" : "text-loss"}`}>${d.cumPnl.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right">{d.winRate.toFixed(1)}%</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
