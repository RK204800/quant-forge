import { useState, useMemo } from "react";
import { useStrategies, useUpdateStrategy, useToggleFavorite, useTags } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, Pencil, Star, Check, X, GitCompareArrows } from "lucide-react";
import { FilterSidebar, FilterState } from "@/components/strategies/FilterSidebar";
import { SortDropdown, SortField } from "@/components/strategies/SortDropdown";
import { TagManagerDialog, TagAssigner } from "@/components/strategies/TagManager";
import { Strategy, StrategyTag } from "@/types";
import { StrategyMetrics } from "@/types";

const STRATEGY_CLASSES = ["RSI Strategy", "Breakout", "Mean Reversion", "ML Model", "A/D Strategy", "Momentum", "Scalping", "Custom"];

function getMetricValue(metrics: StrategyMetrics, field: SortField): number {
  switch (field) {
    case "profitFactor": return metrics.profitFactor;
    case "totalReturn": return metrics.totalReturn;
    case "sharpe": return metrics.sharpeRatio;
    case "sortino": return metrics.sortinoRatio;
    case "winRate": return metrics.winRate;
    case "maxDrawdown": return -metrics.maxDrawdown; // negate so lower DD sorts higher
    case "dateAdded": return 0; // handled separately
  }
}

const Strategies = () => {
  const { data: strategies = [], isLoading } = useStrategies();
  const { data: tags = [] } = useTags();
  const updateStrategy = useUpdateStrategy();
  const toggleFavorite = useToggleFavorite();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [sortField, setSortField] = useState<SortField>("profitFactor");
  const [filters, setFilters] = useState<FilterState>({
    classes: [], timeframes: [], engines: [], assetClasses: [], statuses: [], tagIds: [], favoritesOnly: false, quickFilter: "none",
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Compute metrics for all strategies
  const strategiesWithMetrics = useMemo(() =>
    strategies.map((s) => ({ strategy: s, metrics: calculateMetrics(s.trades, s.equityCurve) })),
    [strategies]
  );

  // Extract available filter values
  const availableClasses = useMemo(() => [...new Set(strategies.map((s) => s.strategyClass).filter(Boolean))] as string[], [strategies]);
  const availableTimeframes = useMemo(() => [...new Set(strategies.map((s) => s.timeframe).filter(Boolean))] as string[], [strategies]);
  const availableEngines = useMemo(() => [...new Set(strategies.map((s) => s.backtestEngine).filter(Boolean))] as string[], [strategies]);
  const availableAssetClasses = useMemo(() => [...new Set(strategies.map((s) => s.assetClass).filter(Boolean))] as string[], [strategies]);

  // Filter
  const filtered = useMemo(() => {
    let result = strategiesWithMetrics;

    if (filters.classes.length > 0) result = result.filter(({ strategy: s }) => s.strategyClass && filters.classes.includes(s.strategyClass));
    if (filters.timeframes.length > 0) result = result.filter(({ strategy: s }) => filters.timeframes.includes(s.timeframe));
    if (filters.engines.length > 0) result = result.filter(({ strategy: s }) => filters.engines.includes(s.backtestEngine));
    if (filters.assetClasses.length > 0) result = result.filter(({ strategy: s }) => filters.assetClasses.includes(s.assetClass));
    if (filters.statuses.length > 0) result = result.filter(({ strategy: s }) => filters.statuses.includes(s.status));
    if (filters.tagIds.length > 0) result = result.filter(({ strategy: s }) => s.tags?.some((t) => filters.tagIds.includes(t.id)));
    if (filters.quickFilter === "favorites") result = result.filter(({ strategy: s }) => s.isFavorite);
    if (filters.quickFilter === "recent") result = result.slice().sort((a, b) => new Date(b.strategy.createdAt).getTime() - new Date(a.strategy.createdAt).getTime()).slice(0, 10);
    if (filters.quickFilter === "best") result = result.slice().sort((a, b) => b.metrics.profitFactor - a.metrics.profitFactor).slice(0, 10);

    return result;
  }, [strategiesWithMetrics, filters]);

  // Sort
  const sorted = useMemo(() => {
    if (sortField === "dateAdded") {
      return [...filtered].sort((a, b) => new Date(b.strategy.createdAt).getTime() - new Date(a.strategy.createdAt).getTime());
    }
    return [...filtered].sort((a, b) => getMetricValue(b.metrics, sortField) - getMetricValue(a.metrics, sortField));
  }, [filtered, sortField]);

  // Group by class
  const grouped = useMemo(() => {
    const groups: Record<string, typeof sorted> = {};
    sorted.forEach((item) => {
      const cls = item.strategy.strategyClass || "Unclassified";
      (groups[cls] ??= []).push(item);
    });
    return groups;
  }, [sorted]);

  const startEdit = (s: Strategy) => {
    setEditingId(s.id);
    setEditName(s.name);
    setEditClass(s.strategyClass || "");
  };

  const saveEdit = () => {
    if (!editingId) return;
    updateStrategy.mutate({ id: editingId, name: editName, strategyClass: editClass || undefined });
    setEditingId(null);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      <FilterSidebar
        filters={filters}
        onFiltersChange={setFilters}
        availableClasses={availableClasses}
        availableTimeframes={availableTimeframes}
        availableEngines={availableEngines}
        availableAssetClasses={availableAssetClasses}
        tags={tags}
      />

      <div className="flex-1 space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight">Strategies</h1>
            <p className="text-sm text-muted-foreground">{strategies.length} strategies loaded</p>
          </div>
          <div className="flex items-center gap-2">
            <SortDropdown value={sortField} onChange={setSortField} />
            <TagManagerDialog />
            {strategies.length > 0 && (
              <Button
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={() => setCompareIds(compareIds.length === strategies.length ? [] : strategies.map((s) => s.id))}
              >
                {compareIds.length === strategies.length ? "Deselect All" : "Select All"}
              </Button>
            )}
            <Button
              variant={compareIds.length >= 2 ? "default" : "outline"}
              size="sm"
              className="gap-2"
              onClick={() => {
                if (compareIds.length >= 2) {
                  navigate(`/strategies/compare?ids=${compareIds.join(",")}`);
                } else {
                  navigate("/strategies/compare");
                }
              }}
            >
              <GitCompareArrows className="h-4 w-4" />
              {compareIds.length >= 2 ? `Compare (${compareIds.length})` : "Compare"}
            </Button>
            <Link to="/strategies/upload">
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Upload</Button>
            </Link>
          </div>
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
          Object.entries(grouped).map(([className, items]) => (
            <div key={className} className="space-y-2">
              <div className="flex items-center gap-2">
                <h2 className="text-xs font-mono uppercase tracking-wider text-muted-foreground">{className}</h2>
                <span className="text-[10px] text-muted-foreground">({items.length})</span>
              </div>
              <div className="grid gap-3">
                {items.map(({ strategy: s, metrics: m }) => (
                  <div key={s.id}>
                    {editingId === s.id ? (
                      <Card className="bg-card border-primary">
                        <CardContent className="p-4 space-y-3">
                          <div className="flex items-center gap-2">
                            <Input value={editName} onChange={(e) => setEditName(e.target.value)} className="h-8 text-sm font-mono" placeholder="Strategy name" autoFocus onKeyDown={(e) => e.key === "Enter" && saveEdit()} />
                            <select value={editClass} onChange={(e) => setEditClass(e.target.value)} className="h-8 text-xs font-mono bg-background border border-border rounded px-2">
                              <option value="">No class</option>
                              {STRATEGY_CLASSES.map((c) => <option key={c} value={c}>{c}</option>)}
                            </select>
                            <Button size="sm" className="h-8 gap-1" onClick={saveEdit}><Check className="h-3 w-3" /> Save</Button>
                            <Button size="sm" variant="ghost" className="h-8" onClick={() => setEditingId(null)}><X className="h-3 w-3" /></Button>
                          </div>
                        </CardContent>
                      </Card>
                    ) : (
                      <Link to={`/strategies/${s.id}`}>
                        <Card className="bg-card border-border hover:border-primary/50 transition-colors">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-4 min-w-0 flex-1">
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleCompare(s.id); }} className="shrink-0">
                                  <Checkbox checked={compareIds.includes(s.id)} />
                                </div>
                                <button
                                  onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggleFavorite(s.id, !!s.isFavorite); }}
                                  className="shrink-0"
                                >
                                  <Star className={`h-4 w-4 ${s.isFavorite ? "fill-yellow-500 text-yellow-500" : "text-muted-foreground hover:text-yellow-500"}`} />
                                </button>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <h3 className="font-mono font-semibold">{s.name}</h3>
                                    <Badge variant={s.status === "active" ? "default" : "secondary"} className="text-[10px]">{s.status}</Badge>
                                    {s.strategyClass && <Badge variant="outline" className="text-[10px]">{s.strategyClass}</Badge>}
                                    <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); startEdit(s); }}>
                                      <Pencil className="h-3 w-3 text-muted-foreground hover:text-foreground" />
                                    </button>
                                  </div>
                                  <p className="text-xs text-muted-foreground mt-1 truncate">{s.description}</p>
                                  <div className="flex gap-3 mt-1.5 text-xs text-muted-foreground flex-wrap">
                                    <span>{s.assetClass}</span>·<span>{s.timeframe}</span>·<span>{s.backtestEngine}</span>·<span>{m.totalTrades} trades</span>
                                  </div>
                                  <div className="mt-1.5" onClick={(e) => e.preventDefault()}>
                                    <TagAssigner strategyId={s.id} currentTags={s.tags || []} />
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center gap-6 shrink-0">
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">PF</p>
                                  <p className="text-sm font-mono font-bold">{m.profitFactor.toFixed(2)}</p>
                                </div>
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
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default Strategies;
