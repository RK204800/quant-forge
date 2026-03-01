import { TrendingUp, TrendingDown, BarChart3, Target } from "lucide-react";

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
  return (
    <div className="flex items-center border-b border-border bg-card/50 overflow-x-auto">
      <Stat label="Portfolio Value" value="$247,832" change={12.4} icon={<TrendingUp className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Day P&L" value="+$1,247" change={0.51} icon={<BarChart3 className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Max Drawdown" value="-8.34%" icon={<TrendingDown className="h-4 w-4" />} />
      <div className="w-px h-8 bg-border" />
      <Stat label="Active Strategies" value="3" icon={<Target className="h-4 w-4" />} />
    </div>
  );
}
