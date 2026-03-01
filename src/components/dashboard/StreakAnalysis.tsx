import { Trade } from "@/types";
import { getStreakSequence } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from "recharts";

interface StreakAnalysisProps {
  trades: Trade[];
}

export function StreakAnalysis({ trades }: StreakAnalysisProps) {
  const streaks = getStreakSequence(trades);
  const chartData = streaks.map((s, i) => ({
    index: i + 1,
    length: s.type === "win" ? s.length : -s.length,
    type: s.type,
    totalPnl: s.totalPnl,
    absLength: s.length,
  }));

  if (chartData.length < 2) {
    return (
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Streak Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-xs text-muted-foreground">Not enough data for streak analysis</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Streak Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[250px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="index" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Streak #", position: "insideBottom", offset: -5, fill: "hsl(215 15% 55%)", fontSize: 10 }} />
              <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Streak Length", angle: -90, position: "insideLeft", fill: "hsl(215 15% 55%)", fontSize: 10 }} />
              <Tooltip contentStyle={{ backgroundColor: "hsl(220 18% 10%)", border: "1px solid hsl(220 13% 18%)", borderRadius: "8px", fontSize: "12px", color: "hsl(210 20% 90%)" }} formatter={(v: number, name: string, props: any) => {
                const d = props.payload;
                return [`${d.absLength} trades, $${d.totalPnl.toFixed(2)}`, d.type === "win" ? "Winning Streak" : "Losing Streak"];
              }} />
              <Bar dataKey="length" radius={[2, 2, 0, 0]}>
                {chartData.map((entry, i) => (
                  <Cell key={i} fill={entry.type === "win" ? "hsl(142 70% 45% / 0.8)" : "hsl(0 72% 51% / 0.8)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
