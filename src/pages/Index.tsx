import { useStrategies, useToggleDashboard } from "@/hooks/use-strategies";
import { calculateMetrics, getMonthlyReturns } from "@/lib/analytics";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { MonthlyHeatmap } from "@/components/dashboard/MonthlyHeatmap";
import { TradeDistribution } from "@/components/dashboard/TradeDistribution";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ArrowRight, Activity, Plus, X, Check, MoreVertical, Briefcase, Eye } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useNavigate } from "react-router-dom";

const Index = () => {
  const { data: strategies = [], isLoading } = useStrategies();
  const toggleDashboard = useToggleDashboard();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (strategies.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your quantitative strategies</p>
        </div>
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground font-mono text-sm">No strategies yet. Upload your first backtest to get started.</p>
            <Link to="/strategies/upload">
              <Button className="gap-2"><Plus className="h-4 w-4" /> Upload Strategy</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const dashboardStrategies = strategies.filter((s) => s.showOnDashboard !== false);
  const offDashboard = strategies.filter((s) => s.showOnDashboard === false);
  const primaryStrategy = dashboardStrategies[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Dashboard</h1>
          <p className="text-sm text-muted-foreground">Overview of your quantitative strategies</p>
        </div>
        <div className="flex items-center gap-3">
          {offDashboard.length > 0 && (
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs font-mono">
                  <Plus className="h-3.5 w-3.5" /> Add Strategy
                </Button>
              </PopoverTrigger>
              <PopoverContent align="end" className="w-64 p-2">
                <p className="text-xs font-mono text-muted-foreground px-2 py-1.5">Add to dashboard</p>
                {offDashboard.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleDashboard(s.id, false)}
                    className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono truncate">{s.name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          )}
          <div className="flex items-center gap-2">
            <Activity className="h-4 w-4 text-profit animate-pulse-glow" />
            <span className="text-xs font-mono text-muted-foreground">Live</span>
          </div>
        </div>
      </div>

      {dashboardStrategies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground font-mono text-sm">No strategies pinned to dashboard.</p>
            <Popover>
              <PopoverTrigger asChild>
                <Button className="gap-2"><Plus className="h-4 w-4" /> Add Strategy</Button>
              </PopoverTrigger>
              <PopoverContent className="w-64 p-2">
                {strategies.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => toggleDashboard(s.id, false)}
                    className="flex items-center gap-2 w-full rounded-sm px-2 py-1.5 text-sm hover:bg-accent transition-colors text-left"
                  >
                    <Plus className="h-3.5 w-3.5 text-muted-foreground" />
                    <span className="font-mono truncate">{s.name}</span>
                  </button>
                ))}
              </PopoverContent>
            </Popover>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* Strategy cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {dashboardStrategies.map((s) => {
              const m = calculateMetrics(s.trades, s.equityCurve);
              return (
                <Link to={`/strategies/${s.id}`} key={s.id}>
                  <Card className="bg-card border-border hover:border-primary/50 transition-colors cursor-pointer relative group">
                    <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-all z-10" onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="p-1 rounded-sm hover:bg-accent transition-colors">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-44">
                          <DropdownMenuItem onClick={() => navigate(`/portfolio?ids=${s.id}`)} className="text-xs font-mono gap-2">
                            <Briefcase className="h-3.5 w-3.5" /> Add to Portfolio
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/strategies/${s.id}`)} className="text-xs font-mono gap-2">
                            <Eye className="h-3.5 w-3.5" /> View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => toggleDashboard(s.id, true)} className="text-xs font-mono gap-2 text-destructive">
                            <X className="h-3.5 w-3.5" /> Remove from Dashboard
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between pr-6">
                        <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
                        <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">{s.assetClass} · {s.timeframe}</p>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                        <div>
                          <span className="text-muted-foreground">Return</span>
                          <p className={m.totalReturn >= 0 ? "text-profit font-medium" : "text-loss font-medium"}>
                            ${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}
                          </p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Sharpe</span>
                          <p className="font-medium">{m.sharpeRatio.toFixed(2)}</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Win Rate</span>
                          <p className="font-medium">{m.winRate.toFixed(1)}%</p>
                        </div>
                        <div>
                          <span className="text-muted-foreground">Max DD</span>
                          <p className="text-loss font-medium">${Math.abs(m.maxDrawdown).toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>

          {/* Primary strategy deep-dive */}
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-mono font-semibold">{primaryStrategy.name}</h2>
            <Link to={`/strategies/${primaryStrategy.id}`} className="text-xs text-primary hover:underline flex items-center gap-1">
              Details <ArrowRight className="h-3 w-3" />
            </Link>
          </div>

          <MetricsGrid metrics={calculateMetrics(primaryStrategy.trades, primaryStrategy.equityCurve)} />

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <EquityCurve data={primaryStrategy.equityCurve} />
            <TradeDistribution trades={primaryStrategy.trades} />
          </div>

          <MonthlyHeatmap data={getMonthlyReturns(primaryStrategy.equityCurve)} />
          <TradesTable trades={primaryStrategy.trades} />
        </>
      )}
    </div>
  );
};

export default Index;
