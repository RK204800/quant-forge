import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MonthlyReturn } from "@/types";

interface MonthlyHeatmapProps {
  data: MonthlyReturn[];
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function getColor(value: number): string {
  if (value > 500) return "bg-profit/80 text-primary-foreground";
  if (value > 200) return "bg-profit/50 text-foreground";
  if (value > 0) return "bg-profit/20 text-foreground";
  if (value === 0) return "bg-muted text-muted-foreground";
  if (value > -200) return "bg-loss/20 text-foreground";
  if (value > -500) return "bg-loss/50 text-foreground";
  return "bg-loss/80 text-destructive-foreground";
}

export function MonthlyHeatmap({ data }: MonthlyHeatmapProps) {
  const years = [...new Set(data.map((d) => d.year))].sort();
  const lookup: Record<string, number> = {};
  data.forEach((d) => { lookup[`${d.year}-${d.month}`] = d.return; });

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Monthly Returns</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono">
            <thead>
              <tr>
                <th className="px-2 py-1 text-left text-muted-foreground">Year</th>
                {MONTHS.map((m) => <th key={m} className="px-2 py-1 text-center text-muted-foreground">{m}</th>)}
                <th className="px-2 py-1 text-center text-muted-foreground">YTD</th>
              </tr>
            </thead>
            <tbody>
              {years.map((year) => {
                const yearData = MONTHS.map((_, i) => lookup[`${year}-${i}`] ?? null);
                const ytd = yearData.filter((v) => v !== null).reduce((a, b) => a! + b!, 0) || 0;
                return (
                  <tr key={year}>
                    <td className="px-2 py-1 text-muted-foreground font-medium">{year}</td>
                    {yearData.map((v, i) => (
                      <td key={i} className="px-1 py-1">
                        {v !== null ? (
                          <div className={`rounded px-2 py-1 text-center ${getColor(v)}`}>
                            ${v.toFixed(0)}
                          </div>
                        ) : <div className="px-2 py-1 text-center text-muted-foreground/30">—</div>}
                      </td>
                    ))}
                    <td className="px-1 py-1">
                      <div className={`rounded px-2 py-1 text-center font-medium ${getColor(ytd)}`}>
                        ${ytd.toFixed(0)}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}
