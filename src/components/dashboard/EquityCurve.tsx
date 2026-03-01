import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityPoint } from "@/types";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar } from "recharts";
import { format } from "date-fns";

interface EquityCurveProps {
  data: EquityPoint[];
  title?: string;
}

const safeNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }}>
          {entry.name === "equity"
            ? `Equity: $${safeNum(entry.value).toLocaleString()}`
            : `Drawdown: ${safeNum(entry.value).toFixed(2)}%`}
        </p>
      ))}
    </div>
  );
};

export function EquityCurve({ data, title = "Equity Curve" }: EquityCurveProps) {
  const validData = data.filter((d) => isFinite(d.equity) && d.equity > 0);
  const chartData = validData.map((d) => ({
    date: format(new Date(d.timestamp), "MMM dd"),
    equity: safeNum(d.equity),
    drawdown: safeNum(-(d.drawdown * 100)),
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
              <YAxis yAxisId="equity" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${(safeNum(v) / 1000).toFixed(0)}k`} />
              <YAxis yAxisId="dd" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${safeNum(v).toFixed(0)}%`} />
              <Tooltip content={<CustomTooltip />} />
              <Area yAxisId="equity" type="monotone" dataKey="equity" stroke="hsl(142 70% 45%)" fill="hsl(142 70% 45% / 0.1)" strokeWidth={2} dot={false} />
              <Bar yAxisId="dd" dataKey="drawdown" fill="hsl(0 72% 51% / 0.3)" />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
