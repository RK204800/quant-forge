import { useState } from "react";
import { Trade } from "@/types";
import { groupByTimeOfDay, summarizeGroup } from "@/lib/analytics";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TimeOfDayChartProps {
  trades: Trade[];
}

export function TimeOfDayChart({ trades }: TimeOfDayChartProps) {
  const [timeType, setTimeType] = useState<"exit" | "entry">("exit");
  const groups = groupByTimeOfDay(trades, timeType === "entry");

  // Generate all 48 half-hour slots
  const allSlots: string[] = [];
  for (let h = 0; h < 24; h++) {
    allSlots.push(`${String(h).padStart(2, "0")}:00`);
    allSlots.push(`${String(h).padStart(2, "0")}:30`);
  }

  const chartData = allSlots.map((slot) => {
    const slotTrades = groups.get(slot) || [];
    const summary = summarizeGroup(slotTrades);
    return { time: slot, ...summary };
  }).filter((d) => d.count > 0);

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Select value={timeType} onValueChange={(v) => setTimeType(v as "exit" | "entry")}>
          <SelectTrigger className="w-[140px] h-8 text-xs font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="exit" className="text-xs font-mono">Exit Time</SelectItem>
            <SelectItem value="entry" className="text-xs font-mono">Entry Time</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
            <XAxis dataKey="time" tick={{ fill: "hsl(215 15% 55%)", fontSize: 9 }} tickLine={false} axisLine={false} interval={0} angle={-45} textAnchor="end" height={50} />
            <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Net Profit"]} />
            <Bar dataKey="netProfit" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.netProfit >= 0 ? "hsl(142 70% 45% / 0.8)" : "hsl(0 72% 51% / 0.8)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ScrollArea className="h-[200px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-mono">Time</TableHead>
              <TableHead className="text-xs font-mono text-right"># Trades</TableHead>
              <TableHead className="text-xs font-mono text-right">Net Profit</TableHead>
              <TableHead className="text-xs font-mono text-right">Gross Profit</TableHead>
              <TableHead className="text-xs font-mono text-right">Gross Loss</TableHead>
              <TableHead className="text-xs font-mono text-right">Win %</TableHead>
              <TableHead className="text-xs font-mono text-right">Avg Trade</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d) => (
              <TableRow key={d.time} className="text-xs font-mono">
                <TableCell className="py-1.5">{d.time}</TableCell>
                <TableCell className="py-1.5 text-right">{d.count}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.netProfit >= 0 ? "text-profit" : "text-loss"}`}>${d.netProfit.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right text-profit">${d.grossProfit.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right text-loss">${d.grossLoss.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right">{d.winRate.toFixed(1)}%</TableCell>
                <TableCell className="py-1.5 text-right">${d.avgTrade.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
