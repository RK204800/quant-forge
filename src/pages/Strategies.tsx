import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Plus, ArrowUpRight } from "lucide-react";

const Strategies = () => {
  const { data: strategies = [], isLoading } = useStrategies();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Strategies</h1>
          <p className="text-sm text-muted-foreground">{strategies.length} strategies loaded</p>
        </div>
        <Link to="/strategies/upload">
          <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Upload Strategy</Button>
        </Link>
      </div>

      {strategies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground font-mono text-sm">No strategies yet. Upload your first backtest.</p>
            <Link to="/strategies/upload">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Strategy</Button>
            </Link>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4">
          {strategies.map((s) => {
            const m = calculateMetrics(s.trades, s.equityCurve);
            return (
              <Link to={`/strategies/${s.id}`} key={s.id}>
                <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-mono font-semibold">{s.name}</h3>
                            <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{s.description}</p>
                          <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                            <span>{s.assetClass}</span>·<span>{s.timeframe}</span>·<span>{s.backtestEngine}</span>·<span>{m.totalTrades} trades</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-6">
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Return</p>
                          <p className={`text-sm font-mono font-bold ${m.totalReturn >= 0 ? "text-profit" : "text-loss"}`}>${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Sharpe</p>
                          <p className="text-sm font-mono font-bold">{m.sharpeRatio.toFixed(2)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Win Rate</p>
                          <p className="text-sm font-mono font-bold">{m.winRate.toFixed(1)}%</p>
                        </div>
                        <ArrowUpRight className="h-4 w-4 text-muted-foreground" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Strategies;
