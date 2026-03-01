import { Trade } from "@/types";
import { computeRollingSharpe } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface RollingSharpeProps {
  trades: Trade[];
  window?: number;
}

export function RollingSharpe({ trades, window = 30 }: RollingSharpeProps) {
  const data = computeRollingSharpe(trades, window);
  const chartData = data.map((d) => ({ trade: d.tradeIndex + 1, sharpe: d.sharpe }));

  if (chartData.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rolling Sharpe ({window}-trade)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not enough trades for rolling Sharpe (need {window}+)</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rolling Sharpe ({window}-trade)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="trade" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <ReferenceLine y={0} stroke="hsl(215 15% 55% / 0.5)" strokeDasharray="3 3" />
              <ReferenceLine y={1} stroke="hsl(142 70% 45% / 0.3)" strokeDasharray="3 3" label={{ value: "Good", fill: "hsl(142 70% 45%)", fontSize: 9 }} />
              <ReferenceLine y={2} stroke="hsl(142 70% 45% / 0.5)" strokeDasharray="3 3" label={{ value: "Excellent", fill: "hsl(142 70% 45%)", fontSize: 9 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number) => [v.toFixed(3), "Sharpe"]} />
              <Line type="monotone" dataKey="sharpe" stroke="hsl(38 92% 50%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
