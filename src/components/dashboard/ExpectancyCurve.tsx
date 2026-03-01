import { Trade } from "@/types";
import { computeRollingExpectancy } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";

interface ExpectancyCurveProps {
  trades: Trade[];
  window?: number;
}

export function ExpectancyCurve({ trades, window = 20 }: ExpectancyCurveProps) {
  const data = computeRollingExpectancy(trades, window);
  const chartData = data.map((d) => ({ trade: d.tradeIndex + 1, expectancy: d.expectancy }));

  if (chartData.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rolling Expectancy ({window}-trade)</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not enough trades for rolling expectancy (need {window}+)</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Rolling Expectancy ({window}-trade)</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="trade" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
              <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `$${v.toFixed(0)}`} />
              <ReferenceLine y={0} stroke="hsl(215 15% 55% / 0.5)" strokeDasharray="3 3" />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number) => [`$${v.toFixed(2)}`, "Expectancy"]} />
              <Line type="monotone" dataKey="expectancy" stroke="hsl(217 91% 60%)" strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
