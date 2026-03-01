import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/types";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface TradeDistributionProps {
  trades: Trade[];
}

export function TradeDistribution({ trades }: TradeDistributionProps) {
  const pnls = trades.map((t) => t.pnlNet);
  const min = Math.min(...pnls);
  const max = Math.max(...pnls);
  const bucketSize = (max - min) / 20 || 1;
  const buckets: Record<number, number> = {};
  
  pnls.forEach((p) => {
    const bucket = Math.floor(p / bucketSize) * bucketSize;
    buckets[bucket] = (buckets[bucket] || 0) + 1;
  });

  const chartData = Object.entries(buckets)
    .map(([k, v]) => ({ range: +k, count: v }))
    .sort((a, b) => a.range - b.range);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">P&L Distribution</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="range" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px" }} />
              <Bar dataKey="count" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.range >= 0 ? "hsl(142 70% 45% / 0.7)" : "hsl(0 72% 51% / 0.7)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
