import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityPoint } from "@/types";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart, Bar, Line, ReferenceLine } from "recharts";
import { format } from "date-fns";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";

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
      <p className="text-muted-foreground mb-1">{payload[0]?.payload?.fullDate ?? label}</p>
      {payload.map((entry: any, i: number) => {
        const isEquity = entry.dataKey === "equityPos" || entry.dataKey === "equityNeg";
        if (isEquity) {
          const raw = entry.payload?.equity;
          if (raw == null) return null;
          const color = raw < 0 ? "hsl(0 72% 51%)" : "hsl(142 70% 45%)";
          return <p key={i} style={{ color }}>P&L: ${safeNum(raw).toLocaleString()}</p>;
        }
        return (
          <p key={i} style={{ color: entry.color }}>
            {entry.dataKey === "drawdown" && `Drawdown: ${safeNum(entry.value).toFixed(2)}%`}
            {entry.dataKey === "peak" && `Peak: $${safeNum(entry.value).toLocaleString()}`}
            {entry.dataKey === "dailyReturn" && `Daily Return: ${safeNum(entry.value).toFixed(3)}%`}
          </p>
        );
      })}
    </div>
  );
};

export function EquityCurve({ data, title = "Equity Curve" }: EquityCurveProps) {
  const [overlays, setOverlays] = useState<string[]>([]);
  const validData = data.filter((d) => isFinite(d.equity));

  // Determine date format based on time span
  const spanMs = validData.length >= 2
    ? new Date(validData[validData.length - 1].timestamp).getTime() - new Date(validData[0].timestamp).getTime()
    : 0;
  const spanDays = spanMs / (1000 * 60 * 60 * 24);
  const dateFmt = spanDays >= 730 ? "MMM ''yy" : spanDays >= 60 ? "MMM dd ''yy" : "MMM dd";
  const tickInterval = validData.length > 10 ? Math.max(1, Math.floor(validData.length / 10)) : 0;

  let runningPeak = 0;
  const chartData = validData.map((d, i) => {
    const eq = safeNum(d.equity);
    if (eq > runningPeak) runningPeak = eq;
    const prevEq = i > 0 ? safeNum(validData[i - 1].equity) : eq;
    const dailyReturn = prevEq !== 0 ? ((eq - prevEq) / Math.abs(prevEq)) * 100 : 0;

    return {
      date: format(new Date(d.timestamp), dateFmt),
      fullDate: format(new Date(d.timestamp), "MMM dd, yyyy"),
      equity: eq,
      equityPos: Math.max(eq, 0),
      equityNeg: Math.min(eq, 0),
      drawdown: safeNum(-(d.drawdown * 100)),
      peak: runningPeak,
      dailyReturn,
    };
  });

  const showDrawdown = overlays.includes("drawdown");
  const showPeak = overlays.includes("peak");
  const showDaily = overlays.includes("daily");

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">{title}</CardTitle>
          <ToggleGroup type="multiple" value={overlays} onValueChange={setOverlays} className="gap-0.5">
            <ToggleGroupItem value="drawdown" className="text-[10px] h-6 px-2 font-mono">DD</ToggleGroupItem>
            <ToggleGroupItem value="peak" className="text-[10px] h-6 px-2 font-mono">Peak</ToggleGroupItem>
            <ToggleGroupItem value="daily" className="text-[10px] h-6 px-2 font-mono">Daily</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
              <XAxis dataKey="date" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval={tickInterval} />
              <YAxis yAxisId="equity" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => { const abs = Math.abs(v); const label = abs >= 1000 ? `$${(abs/1000).toFixed(0)}k` : `$${abs.toFixed(0)}`; return v < 0 ? `-${label}` : label; }} />
              {(showDrawdown || showDaily) && (
                <YAxis yAxisId="pct" orientation="right" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${safeNum(v).toFixed(0)}%`} />
              )}
              <Tooltip content={<CustomTooltip />} />
              <ReferenceLine yAxisId="equity" y={0} stroke="hsl(215 15% 55%)" strokeDasharray="4 4" strokeOpacity={0.5} />
              <Area yAxisId="equity" type="monotone" dataKey="equityPos" stroke="hsl(142 70% 45%)" fill="hsl(142 70% 45% / 0.1)" strokeWidth={2} dot={false} />
              <Area yAxisId="equity" type="monotone" dataKey="equityNeg" stroke="hsl(0 72% 51%)" fill="hsl(0 72% 51% / 0.1)" strokeWidth={2} dot={false} />
              {showPeak && (
                <Line yAxisId="equity" type="monotone" dataKey="peak" stroke="hsl(217 91% 60% / 0.5)" strokeWidth={1} strokeDasharray="4 4" dot={false} />
              )}
              {showDrawdown && (
                <Bar yAxisId="pct" dataKey="drawdown" fill="hsl(0 72% 51% / 0.3)" />
              )}
              {showDaily && (
                <Bar yAxisId="pct" dataKey="dailyReturn" fill="hsl(38 92% 50% / 0.4)" />
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  );
}
