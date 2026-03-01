import { Trade } from "@/types";
import { groupByDayOfWeek, summarizeGroup } from "@/lib/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface DayOfWeekChartProps {
  trades: Trade[];
}

const DAY_ORDER = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function DayOfWeekChart({ trades }: DayOfWeekChartProps) {
  const groups = groupByDayOfWeek(trades);

  const chartData = DAY_ORDER.map((day) => {
    const dayTrades = groups.get(day) || [];
    const summary = summarizeGroup(dayTrades);
    return { day, ...summary };
  }).filter((d) => d.count > 0);

  return (
    <div className="space-y-4">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
            <XAxis dataKey="day" tick={{ fill: "hsl(215 15% 55%)", fontSize: 11 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Net Profit"]} />
            <Bar dataKey="netProfit" radius={[4, 4, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.netProfit >= 0 ? "hsl(142 70% 45% / 0.8)" : "hsl(0 72% 51% / 0.8)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="text-xs font-mono">Day</TableHead>
            <TableHead className="text-xs font-mono text-right"># Trades</TableHead>
            <TableHead className="text-xs font-mono text-right">Net Profit</TableHead>
            <TableHead className="text-xs font-mono text-right">Win %</TableHead>
            <TableHead className="text-xs font-mono text-right">Avg Trade</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {chartData.map((d) => (
            <TableRow key={d.day} className="text-xs font-mono">
              <TableCell className="py-1.5">{d.day}</TableCell>
              <TableCell className="py-1.5 text-right">{d.count}</TableCell>
              <TableCell className={`py-1.5 text-right ${d.netProfit >= 0 ? "text-profit" : "text-loss"}`}>${d.netProfit.toFixed(2)}</TableCell>
              <TableCell className="py-1.5 text-right">{d.winRate.toFixed(1)}%</TableCell>
              <TableCell className="py-1.5 text-right">${d.avgTrade.toFixed(2)}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
