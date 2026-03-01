import { Trade } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TradePnlChartProps {
  trades: Trade[];
}

export function TradePnlChart({ trades }: TradePnlChartProps) {
  const sorted = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());
  let cumPnl = 0;
  const chartData = sorted.map((t, i) => {
    cumPnl += t.pnlNet;
    return { index: i + 1, pnl: t.pnlNet, cumPnl, date: format(new Date(t.exitTime), "MM/dd"), instrument: t.instrument, commission: t.commission };
  });

  return (
    <div className="space-y-4">
      <div className="h-[280px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
            <XAxis dataKey="index" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Trade #", position: "insideBottom", offset: -5, fill: "hsl(215 15% 55%)", fontSize: 10 }} />
            <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
            <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number) => [`$${v.toFixed(2)}`, ""]} />
            <Bar dataKey="pnl" radius={[2, 2, 0, 0]}>
              {chartData.map((entry, i) => (
                <Cell key={i} fill={entry.pnl >= 0 ? "hsl(142 70% 45% / 0.8)" : "hsl(0 72% 51% / 0.8)"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <ScrollArea className="h-[200px]">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="text-xs font-mono">#</TableHead>
              <TableHead className="text-xs font-mono">Date</TableHead>
              <TableHead className="text-xs font-mono">Instrument</TableHead>
              <TableHead className="text-xs font-mono text-right">Net P&L</TableHead>
              <TableHead className="text-xs font-mono text-right">Cum. P&L</TableHead>
              <TableHead className="text-xs font-mono text-right">Commission</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {chartData.map((d) => (
              <TableRow key={d.index} className="text-xs font-mono">
                <TableCell className="py-1.5">{d.index}</TableCell>
                <TableCell className="py-1.5">{d.date}</TableCell>
                <TableCell className="py-1.5">{d.instrument}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.pnl >= 0 ? "text-profit" : "text-loss"}`}>${d.pnl.toFixed(2)}</TableCell>
                <TableCell className={`py-1.5 text-right ${d.cumPnl >= 0 ? "text-profit" : "text-loss"}`}>${d.cumPnl.toFixed(2)}</TableCell>
                <TableCell className="py-1.5 text-right text-muted-foreground">${d.commission.toFixed(2)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </ScrollArea>
    </div>
  );
}
