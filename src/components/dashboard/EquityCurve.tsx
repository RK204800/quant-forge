import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityPoint } from "@/types";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { format } from "date-fns";

interface EquityCurveProps {
  data: EquityPoint[];
  title?: string;
}

export function EquityCurve({ data, title = "Equity Curve" }: EquityCurveProps) {
  const chartData = data.map((d) => ({
    date: format(new Date(d.timestamp), "MMM dd"),
    equity: d.equity,
    drawdown: -(d.drawdown * 100),
  }));

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
              <YAxis yAxisId="equity" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="dd" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${v.toFixed(0)}%`} />
              <Tooltip
                contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px" }}
                labelStyle={{ color: "hsl(210 20% 90%)" }}
              />
              <Area yAxisId="equity" type="monotone" dataKey="equity" stroke="hsl(142 70% 45%)" fill="hsl(142 70% 45% / 0.1)" strokeWidth={2} dot={false} />
              <Bar yAxisId="dd" dataKey="drawdown" fill="hsl(0 72% 51% / 0.3)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
