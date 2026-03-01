import { useState, useMemo, useEffect } from "react";
import { computeRollingSharpe } from "@/lib/analytics";
import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { ArrowLeft, GitCompareArrows, X } from "lucide-react";
import { Link, useSearchParams } from "react-router-dom";
import { Strategy, StrategyMetrics, EquityPoint } from "@/types";
import { Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ComposedChart } from "recharts";
import { format } from "date-fns";

const COLORS = [
  "hsl(142 70% 45%)",
  "hsl(217 91% 60%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 72% 51%)",
  "hsl(180 60% 45%)",
];

interface MetricRow {
  label: string;
  key: string;
  format: (v: number) => string;
  higherIsBetter: boolean;
}

const METRIC_ROWS: MetricRow[] = [
  { label: "Total Return", key: "totalReturn", format: (v) => `$${v.toLocaleString(undefined, { maximumFractionDigits: 0 })}`, higherIsBetter: true },
  { label: "Sharpe Ratio", key: "sharpeRatio", format: (v) => v.toFixed(2), higherIsBetter: true },
  { label: "Sortino Ratio", key: "sortinoRatio", format: (v) => v.toFixed(2), higherIsBetter: true },
  { label: "Calmar Ratio", key: "calmarRatio", format: (v) => v.toFixed(2), higherIsBetter: true },
  { label: "Max Drawdown", key: "maxDrawdown", format: (v) => `-${v.toFixed(2)}%`, higherIsBetter: false },
  { label: "Win Rate", key: "winRate", format: (v) => `${v.toFixed(1)}%`, higherIsBetter: true },
  { label: "Profit Factor", key: "profitFactor", format: (v) => v === Infinity ? "∞" : v.toFixed(2), higherIsBetter: true },
  { label: "Expectancy", key: "expectancy", format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
  { label: "Total Trades", key: "totalTrades", format: (v) => v.toString(), higherIsBetter: true },
  { label: "Avg Win", key: "avgWin", format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
  { label: "Avg Loss", key: "avgLoss", format: (v) => `$${v.toFixed(2)}`, higherIsBetter: false },
  { label: "Best Trade", key: "bestTrade", format: (v) => `$${v.toFixed(2)}`, higherIsBetter: true },
  { label: "Worst Trade", key: "worstTrade", format: (v) => `$${v.toFixed(2)}`, higherIsBetter: false },
  { label: "Avg Hold (days)", key: "avgHoldingPeriod", format: (v) => v.toFixed(1), higherIsBetter: false },
];

function getBestIndex(values: number[], higherIsBetter: boolean): number {
  if (values.length === 0) return -1;
  let bestIdx = 0;
  for (let i = 1; i < values.length; i++) {
    if (higherIsBetter ? values[i] > values[bestIdx] : values[i] < values[bestIdx]) {
      bestIdx = i;
    }
  }
  return bestIdx;
}

const safeNum = (v: unknown, fallback = 0): number => {
  const n = Number(v);
  return isFinite(n) ? n : fallback;
};

const CompareTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card border border-border rounded-lg p-2 text-xs shadow-lg">
      <p className="text-muted-foreground mb-1">{label}</p>
      {payload.map((entry: any, i: number) => (
        <p key={i} style={{ color: entry.color }} className="font-mono">
          {entry.name}: ${safeNum(entry.value).toLocaleString()}
        </p>
      ))}
    </div>
  );
};

const CompareStrategies = () => {
  const { data: strategies = [], isLoading } = useStrategies();
  const [searchParams] = useSearchParams();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pre-select strategies from URL params
  useEffect(() => {
    const idsParam = searchParams.get("ids");
    if (idsParam && strategies.length > 0 && selectedIds.length === 0) {
      const ids = idsParam.split(",").filter((id) => strategies.some((s) => s.id === id));
      if (ids.length > 0) setSelectedIds(ids);
    }
  }, [searchParams, strategies]);

  const toggleSelection = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const selected = useMemo(
    () => strategies.filter((s) => selectedIds.includes(s.id)),
    [strategies, selectedIds]
  );

  const metricsMap = useMemo(() => {
    const map = new Map<string, StrategyMetrics>();
    selected.forEach((s) => map.set(s.id, calculateMetrics(s.trades, s.equityCurve)));
    return map;
  }, [selected]);

  // Build normalized equity curves for overlay
  const equityChartData = useMemo(() => {
    if (selected.length === 0) return [];
    const allDates = new Map<string, Record<string, number>>();

    selected.forEach((s) => {
      const sorted = [...s.equityCurve].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      if (sorted.length === 0) return;
      const startEquity = sorted[0].equity;
      sorted.forEach((p) => {
        const dateKey = format(new Date(p.timestamp), "yyyy-MM-dd");
        const row = allDates.get(dateKey) || {};
        // Normalize to percentage return from start
        row[s.id] = startEquity > 0 ? ((p.equity - startEquity) / startEquity) * 100 : 0;
        allDates.set(dateKey, row);
      });
    });

    return Array.from(allDates.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date: format(new Date(date), "MMM dd"),
        ...values,
      }));
  }, [selected]);

  // Build drawdown data for overlay
  const drawdownChartData = useMemo(() => {
    if (selected.length === 0) return [];
    const allDates = new Map<string, Record<string, number>>();

    selected.forEach((s) => {
      const sorted = [...s.equityCurve].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      if (sorted.length === 0) return;
      let peak = sorted[0].equity;
      sorted.forEach((p) => {
        if (p.equity > peak) peak = p.equity;
        const dd = peak > 0 ? -((peak - p.equity) / peak) * 100 : 0;
        const dateKey = format(new Date(p.timestamp), "yyyy-MM-dd");
        const row = allDates.get(dateKey) || {};
        row[s.id] = dd;
        allDates.set(dateKey, row);
      });
    });

    return Array.from(allDates.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, values]) => ({
        date: format(new Date(date), "MMM dd"),
        ...values,
      }));
  }, [selected]);

  // Build rolling Sharpe data
  const rollingSharpeData = useMemo(() => {
    if (selected.length === 0) return [];
    const maxLen = Math.max(...selected.map((s) => s.trades.length));
    const rows: Record<string, any>[] = [];

    for (let i = 0; i < maxLen; i++) {
      rows.push({ trade: i + 1 });
    }

    selected.forEach((s) => {
      const rolling = computeRollingSharpe(s.trades, 30);
      rolling.forEach((r) => {
        if (rows[r.tradeIndex]) {
          rows[r.tradeIndex][s.id] = r.sharpe;
        }
      });
    });

    return rows;
  }, [selected]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-6xl">
      <div>
        <Link to="/strategies" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Strategies
        </Link>
        <h1 className="text-2xl font-bold font-mono tracking-tight flex items-center gap-2">
          <GitCompareArrows className="h-5 w-5" /> Compare Strategies
        </h1>
        <p className="text-sm text-muted-foreground">Select 2 or more strategies to compare side by side</p>
      </div>

      {/* Strategy selector */}
      <Card className="bg-card border-border">
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-mono">Select Strategies ({selectedIds.length} selected)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          {strategies.map((s) => {
            const m = calculateMetrics(s.trades, s.equityCurve);
            const isSelected = selectedIds.includes(s.id);
            const colorIdx = selectedIds.indexOf(s.id);
            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 p-2 rounded-md cursor-pointer transition-colors ${
                  isSelected ? "bg-primary/10 border border-primary/30" : "hover:bg-muted/50 border border-transparent"
                }`}
                onClick={() => toggleSelection(s.id)}
              >
                <Checkbox checked={isSelected} className="shrink-0" />
                {isSelected && (
                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[colorIdx % COLORS.length] }} />
                )}
                <span className="font-mono text-sm truncate flex-1">{s.name}</span>
                {s.strategyClass && <Badge variant="outline" className="text-[10px] shrink-0">{s.strategyClass}</Badge>}
                <span className="text-xs text-muted-foreground font-mono shrink-0">{m.totalTrades} trades</span>
                <span className={`text-xs font-mono font-bold shrink-0 ${m.totalReturn >= 0 ? "text-profit" : "text-loss"}`}>
                  ${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                </span>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {selected.length >= 2 && (
        <>
          {/* Equity curve overlay */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Normalized Equity Curves (%)</CardTitle>
                <div className="flex gap-3">
                  {selected.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[350px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={equityChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${safeNum(v).toFixed(0)}%`} />
                    <Tooltip content={<CompareTooltip />} />
                    {selected.map((s, i) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        name={s.name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={`${COLORS[i % COLORS.length].replace(")", " / 0.08)")}`}
                        strokeWidth={2}
                        dot={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Drawdown comparison */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Drawdown Comparison (%)</CardTitle>
                <div className="flex gap-3">
                  {selected.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={drawdownChartData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
                    <XAxis dataKey="date" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                    <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} tickFormatter={(v) => `${safeNum(v).toFixed(1)}%`} />
                    <Tooltip content={<CompareTooltip />} />
                    {selected.map((s, i) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        name={s.name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={`${COLORS[i % COLORS.length].replace(")", " / 0.12)")}`}
                        strokeWidth={1.5}
                        dot={false}
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Rolling Sharpe comparison */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Rolling Sharpe (30-trade window)</CardTitle>
                <div className="flex gap-3">
                  {selected.map((s, i) => (
                    <div key={s.id} className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">{s.name}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[250px]">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={rollingSharpeData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(220 13% 18%)" />
                    <XAxis dataKey="trade" tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} label={{ value: "Trade #", position: "insideBottom", offset: -5, fill: "hsl(215 15% 55%)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "hsl(215 15% 55%)", fontSize: 10 }} tickLine={false} axisLine={false} />
                    <Tooltip content={<CompareTooltip />} />
                    {selected.map((s, i) => (
                      <Area
                        key={s.id}
                        type="monotone"
                        dataKey={s.id}
                        name={s.name}
                        stroke={COLORS[i % COLORS.length]}
                        fill={`${COLORS[i % COLORS.length].replace(")", " / 0.06)")}`}
                        strokeWidth={1.5}
                        dot={false}
                        connectNulls
                      />
                    ))}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          {/* Metrics comparison table */}
          <Card className="bg-card border-border">
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">Metrics Comparison</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left text-xs text-muted-foreground font-mono py-2 pr-4 sticky left-0 bg-card">Metric</th>
                      {selected.map((s, i) => (
                        <th key={s.id} className="text-right text-xs font-mono py-2 px-3 min-w-[120px]">
                          <div className="flex items-center justify-end gap-1.5">
                            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                            <span className="truncate max-w-[100px]">{s.name}</span>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {METRIC_ROWS.map((row) => {
                      const values = selected.map((s) => {
                        const m = metricsMap.get(s.id);
                        return m ? (m as any)[row.key] as number : 0;
                      });
                      const bestIdx = getBestIndex(values, row.higherIsBetter);
                      return (
                        <tr key={row.key} className="border-b border-border/50 hover:bg-muted/30 transition-colors">
                          <td className="text-xs text-muted-foreground font-mono py-2.5 pr-4 sticky left-0 bg-card">{row.label}</td>
                          {values.map((v, i) => (
                            <td key={selected[i].id} className={`text-right font-mono py-2.5 px-3 ${i === bestIdx ? "text-profit font-bold" : "text-foreground"}`}>
                              {row.format(v)}
                            </td>
                          ))}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </>
      )}

      {selected.length === 1 && (
        <div className="text-center py-12 text-muted-foreground font-mono text-sm">
          Select at least one more strategy to compare
        </div>
      )}
    </div>
  );
};

export default CompareStrategies;
