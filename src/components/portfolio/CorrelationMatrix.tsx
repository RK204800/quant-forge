import { useMemo } from "react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EquityPoint } from "@/types";

interface StrategyData {
  id: string;
  name: string;
  equityCurve: EquityPoint[];
}

const COLORS = [
  "hsl(142 70% 45%)",
  "hsl(217 91% 60%)",
  "hsl(45 93% 47%)",
  "hsl(0 84% 60%)",
  "hsl(280 68% 60%)",
  "hsl(173 80% 40%)",
  "hsl(25 95% 53%)",
  "hsl(330 80% 60%)",
];

function pearson(a: number[], b: number[]): number {
  const n = a.length;
  if (n < 3) return 0;
  const meanA = a.reduce((s, v) => s + v, 0) / n;
  const meanB = b.reduce((s, v) => s + v, 0) / n;
  let num = 0, denA = 0, denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA, db = b[i] - meanB;
    num += da * db; denA += da * da; denB += db * db;
  }
  const den = Math.sqrt(denA * denB);
  return den === 0 ? 0 : num / den;
}

export function CorrelationMatrix({ strategies }: { strategies: StrategyData[] }) {
  const matrix = useMemo(() => {
    if (strategies.length < 2) return [];

    const returnSeries: Record<string, Map<string, number>> = {};
    strategies.forEach((s) => {
      const sorted = [...s.equityCurve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
      const daily = new Map<string, number>();
      for (let i = 1; i < sorted.length; i++) {
        const dateKey = format(new Date(sorted[i].timestamp), "yyyy-MM-dd");
        const ret = sorted[i - 1].equity !== 0 ? (sorted[i].equity - sorted[i - 1].equity) / sorted[i - 1].equity : 0;
        daily.set(dateKey, ret);
      }
      returnSeries[s.id] = daily;
    });

    const allDates = new Set<string>();
    Object.values(returnSeries).forEach((m) => m.forEach((_, k) => allDates.add(k)));
    const commonDates = [...allDates].filter((d) => strategies.every((s) => returnSeries[s.id].has(d))).sort();

    return strategies.map((si) => {
      const ri = commonDates.map((d) => returnSeries[si.id].get(d) || 0);
      return strategies.map((sj) => {
        if (si.id === sj.id) return 1;
        const rj = commonDates.map((d) => returnSeries[sj.id].get(d) || 0);
        return pearson(ri, rj);
      });
    });
  }, [strategies]);

  if (strategies.length < 2) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono uppercase tracking-wider text-muted-foreground">
          Return Correlation Matrix
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="text-sm">
            <thead>
              <tr>
                <th className="text-left text-xs text-muted-foreground font-mono py-2 pr-3" />
                {strategies.map((s, i) => (
                  <th key={s.id} className="text-center text-xs font-mono py-2 px-3 min-w-[100px]">
                    <div className="flex items-center justify-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
                      <span className="truncate max-w-[80px]">{s.name}</span>
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {strategies.map((si, ri) => (
                <tr key={si.id}>
                  <td className="text-xs font-mono text-muted-foreground py-2 pr-3 whitespace-nowrap">
                    <div className="flex items-center gap-1.5">
                      <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: COLORS[ri % COLORS.length] }} />
                      <span className="truncate max-w-[100px]">{si.name}</span>
                    </div>
                  </td>
                  {matrix[ri]?.map((corr, ci) => {
                    const abs = Math.abs(corr);
                    const hue = corr >= 0 ? 142 : 0;
                    const bg = ri === ci ? "hsl(215 15% 20%)" : `hsl(${hue} 70% 45% / ${abs * 0.4})`;
                    return (
                      <td key={strategies[ci].id} className="text-center font-mono text-xs py-2 px-3" style={{ backgroundColor: bg }}>
                        {corr.toFixed(2)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
