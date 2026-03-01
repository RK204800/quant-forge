import { useState } from "react";
import { Trade } from "@/types";
import { groupByPeriod, summarizeGroup } from "@/lib/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell, Line, ComposedChart } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronDown, ChevronRight } from "lucide-react";

interface PeriodBarChartProps {
  trades: Trade[];
  period: "daily" | "weekly" | "monthly";
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay();
}

function MonthlyCalendar({ trades, monthKey }: { trades: Trade[]; monthKey: string }) {
  const [year, monthStr] = monthKey.split("-");
  const y = parseInt(year);
  const m = parseInt(monthStr) - 1;
  const daysInMonth = getDaysInMonth(y, m);
  const firstDay = getFirstDayOfWeek(y, m);

  const dailyMap = new Map<number, { pnl: number; count: number }>();
  trades.forEach((t) => {
    const d = new Date(t.exitTime);
    if (d.getFullYear() === y && d.getMonth() === m) {
      const day = d.getDate();
      const existing = dailyMap.get(day) || { pnl: 0, count: 0 };
      existing.pnl += t.pnlNet;
      existing.count += 1;
      dailyMap.set(day, existing);
    }
  });

  const weeks: (number | null)[][] = [];
  let currentWeek: (number | null)[] = Array(firstDay).fill(null);
  for (let day = 1; day <= daysInMonth; day++) {
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  }
  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) currentWeek.push(null);
    weeks.push(currentWeek);
  }

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-7 gap-1 max-w-[500px]">
        {dayNames.map((d) => (
          <div key={d} className="text-[10px] font-mono text-muted-foreground text-center py-1">{d}</div>
        ))}
        {weeks.flat().map((day, i) => {
          if (day === null) return <div key={i} className="h-14" />;
          const data = dailyMap.get(day);
          const pnl = data?.pnl ?? 0;
          const count = data?.count ?? 0;
          const hasData = !!data;

          return (
            <div
              key={i}
              className={`h-14 rounded border flex flex-col items-center justify-center gap-0.5 text-xs font-mono
                ${hasData
                  ? pnl >= 0
                    ? "border-profit/30 bg-profit/10"
                    : "border-loss/30 bg-loss/10"
                  : "border-border bg-muted/30"
                }`}
            >
              <span className="text-[10px] text-muted-foreground">{day}</span>
              {hasData && (
                <>
                  <span className={`text-[11px] font-semibold ${pnl >= 0 ? "text-profit" : "text-loss"}`}>
                    ${Math.abs(pnl) >= 1000 ? `${(pnl / 1000).toFixed(1)}k` : pnl.toFixed(0)}
                  </span>
                  <span className="text-[9px] text-muted-foreground">{count}t</span>
                </>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function PeriodBarChart({ trades, period }: PeriodBarChartProps) {
  const [expandedMonth, setExpandedMonth] = useState<string | null>(null);
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
      <ScrollArea className="h-[300px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              {period === "monthly" && <TableHead className="text-xs font-mono w-8"></TableHead>}
              <TableHead className="text-xs font-mono">Period</TableHead>
              <TableHead className="text-xs font-mono text-right"># Trades</TableHead>
              <TableHead className="text-xs font-mono text-right">Net Profit</TableHead>
              <TableHead className="text-xs font-mono text-right">Cum. P&L</TableHead>
              <TableHead className="text-xs font-mono text-right">Win %</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d) => {
              const isExpanded = period === "monthly" && expandedMonth === d.label;
              return (
                <>{/* Fragment needed for adjacent rows */}
                  <TableRow
                    key={d.label}
                    className={`text-xs font-mono ${period === "monthly" ? "cursor-pointer hover:bg-muted/50" : ""}`}
                    onClick={() => {
                      if (period === "monthly") {
                        setExpandedMonth(isExpanded ? null : d.label);
                      }
                    }}
                  >
                    {period === "monthly" && (
                      <TableCell className="py-1.5 w-8 pr-0">
                        {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
                      </TableCell>
                    )}
                    <TableCell className="py-1.5">{d.label}</TableCell>
                    <TableCell className="py-1.5 text-right">{d.count}</TableCell>
                    <TableCell className={`py-1.5 text-right ${d.netProfit >= 0 ? "text-profit" : "text-loss"}`}>${d.netProfit.toFixed(2)}</TableCell>
                    <TableCell className={`py-1.5 text-right ${d.cumPnl >= 0 ? "text-profit" : "text-loss"}`}>${d.cumPnl.toFixed(2)}</TableCell>
                    <TableCell className="py-1.5 text-right">{d.winRate.toFixed(1)}%</TableCell>
                  </TableRow>
                  {isExpanded && (
                    <TableRow key={`${d.label}-cal`} className="hover:bg-transparent">
                      <TableCell colSpan={6} className="p-0 border-b border-border">
                        <MonthlyCalendar trades={trades} monthKey={d.label} />
                      </TableCell>
                    </TableRow>
                  )}
                </>
              );
            })}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
