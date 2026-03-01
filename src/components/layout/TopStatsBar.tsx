import { TrendingUp, TrendingDown, BarChart3, Target, Plus } from "lucide-react";
import { Link } from "react-router-dom";
import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";

interface StatProps {
  label: string;
  value: string;
  change?: number;
  icon: React.ReactNode;
}

function Stat({ label, value, change, icon }: StatProps) {
  return (
    <div className="flex items-center gap-3 px-4 py-2">
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-foreground">{value}</span>
          {change !== undefined && (
            <span className={`text-xs font-mono ${change >= 0 ? "text-profit" : "text-loss"}`}>
              {change >= 0 ? "+" : ""}{change.toFixed(2)}%
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

export function TopStatsBar() {
  const { data: strategies = [] } = useStrategies();

  const activeStrategies = strategies.filter((s) => s.status === "active");
  const allTrades = strategies.flatMap((s) => s.trades);
  const totalPnl = allTrades.reduce((sum, t) => sum + t.pnlNet, 0);

  let maxDD = 0;
  strategies.forEach((s) => {
    const m = calculateMetrics(s.trades, s.equityCurve);
    if (m.maxDrawdown > maxDD) maxDD = m.maxDrawdown;
  });

  return (
    <div className="flex items-center border-b border-border bg-card/50 overflow-x-auto">
      <Stat label="Total P&L" value={`$${totalPnl.toLocaleString(undefined, { maximumFractionDigits: 0 })}`} icon={<TrendingUp className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Total Trades" value={allTrades.length.toString()} icon={<BarChart3 className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Max Drawdown" value={maxDD ? `$${Math.abs(maxDD).toLocaleString(undefined, { maximumFractionDigits: 0 })}` : "—"} icon={<TrendingDown className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Active Strategies" value={activeStrategies.length.toString()} icon={<Target className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <div className="flex items-center px-4 py-2">
        <Button asChild size="sm" className="gap-1.5">
          <Link to="/strategies/upload">
            <Plus className="h-4 w-4" />
            Upload
          </Link>
        </Button>
      </div>
    </div>
  );
}
