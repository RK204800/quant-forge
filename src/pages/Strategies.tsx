import { useState, useMemo, DragEvent } from "react";
import { useStrategies, useUpdateStrategy, useToggleFavorite, useToggleDashboard, useTags, useRecomputeAllEquity, useArchiveStrategies, useRestoreStrategies, useDeleteStrategies } from "@/hooks/use-strategies";
import { useFolders, useMoveToFolder } from "@/hooks/use-folders";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuSub, DropdownMenuSubTrigger, DropdownMenuSubContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Link, useNavigate } from "react-router-dom";
import { Plus, ArrowUpRight, Pencil, Star, Check, X, GitCompareArrows, RefreshCw, LayoutDashboard, Briefcase, MoreVertical, FolderInput, Tags, Archive, Trash2, RotateCcw } from "lucide-react";
import { AddToPortfolioDialog } from "@/components/portfolio/AddToPortfolioDialog";
import { FilterSidebar, FilterState } from "@/components/strategies/FilterSidebar";
import { SortDropdown, SortField } from "@/components/strategies/SortDropdown";
import { TagManagerDialog, TagAssigner } from "@/components/strategies/TagManager";
import { Strategy, StrategyTag } from "@/types";
import { StrategyMetrics } from "@/types";
import { toast } from "sonner";

const STRATEGY_CLASSES = ["RSI Strategy", "Breakout", "Mean Reversion", "ML Model", "A/D Strategy", "Momentum", "Scalping", "Custom"];

function safeFmt(v: number, decimals = 2): string {
  if (!isFinite(v) || isNaN(v)) return "—";
  return v.toFixed(decimals);
}

function getMetricValue(metrics: StrategyMetrics, field: SortField): number {
  switch (field) {
    case "profitFactor": return metrics.profitFactor;
    case "totalReturn": return metrics.totalReturn;
    case "sharpe": return metrics.sharpeRatio;
    case "sortino": return metrics.sortinoRatio;
    case "winRate": return metrics.winRate;
    case "maxDrawdown": return -metrics.maxDrawdown;
    case "dateAdded": return 0;
  }
}

const Strategies = () => {
  const { data: strategies = [], isLoading } = useStrategies();
  const { data: tags = [] } = useTags();
  const { data: folders = [] } = useFolders();
  const updateStrategy = useUpdateStrategy();
  const toggleFavorite = useToggleFavorite();
  const recomputeAll = useRecomputeAllEquity();
  const moveToFolder = useMoveToFolder();
  const archiveStrategies = useArchiveStrategies();
  const restoreStrategies = useRestoreStrategies();
  const deleteStrategies = useDeleteStrategies();
  const navigate = useNavigate();

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editClass, setEditClass] = useState("");
  const [sortField, setSortField] = useState<SortField>("profitFactor");
  const [filters, setFilters] = useState<FilterState>({
    classes: [], timeframes: [], engines: [], assetClasses: [], statuses: [], tagIds: [], favoritesOnly: false, quickFilter: "none",
  });
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [tagManagerOpen, setTagManagerOpen] = useState(false);
  const [deleteConfirmIds, setDeleteConfirmIds] = useState<string[]>([]);
  const [portfolioDialogIds, setPortfolioDialogIds] = useState<string[]>([]);

  const isArchiveView = selectedFolderId === "archived";

  const toggleCompare = (id: string) => {
    setCompareIds((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  };

  // Compute metrics for all strategies
  const strategiesWithMetrics = useMemo(() =>
    strategies.map((s) => ({ strategy: s, metrics: calculateMetrics(s.trades, s.equityCurve) })),
    [strategies]
  );

  // Folder counts — exclude archived from "all" and "uncategorized"
  const folderCounts = useMemo(() => {
    const counts: Record<string, number> = { all: 0, uncategorized: 0, archived: 0 };
    strategies.forEach((s) => {
      if (s.status === "archived") {
        counts.archived++;
        return;
      }
      counts.all++;
      if (!s.folderId) {
        counts.uncategorized++;
      } else {
        counts[s.folderId] = (counts[s.folderId] ?? 0) + 1;
      }
    });
    return counts;
  }, [strategies]);

  // Extract available filter values
  const availableClasses = useMemo(() => [...new Set(strategies.map((s) => s.strategyClass).filter(Boolean))] as string[], [strategies]);
  const availableTimeframes = useMemo(() => [...new Set(strategies.map((s) => s.timeframe).filter(Boolean))] as string[], [strategies]);
  const availableEngines = useMemo(() => [...new Set(strategies.map((s) => s.backtestEngine).filter(Boolean))] as string[], [strategies]);
  const availableAssetClasses = useMemo(() => [...new Set(strategies.map((s) => s.assetClass).filter(Boolean))] as string[], [strategies]);

  // Filter by folder first
  const folderFiltered = useMemo(() => {
    if (selectedFolderId === "archived") return strategiesWithMetrics.filter(({ strategy: s }) => s.status === "archived");
    if (selectedFolderId === null) return strategiesWithMetrics.filter(({ strategy: s }) => s.status !== "archived");
    if (selectedFolderId === "uncategorized") return strategiesWithMetrics.filter(({ strategy: s }) => !s.folderId && s.status !== "archived");
    return strategiesWithMetrics.filter(({ strategy: s }) => s.folderId === selectedFolderId && s.status !== "archived");
  }, [strategiesWithMetrics, selectedFolderId]);

  // Then apply sidebar filters
  const filtered = useMemo(() => {
    let result = folderFiltered;
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
  }, [folderFiltered, filters]);

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

  const hasSelection = compareIds.length > 0;

  const handleArchiveDrop = (ids: string[]) => {
    archiveStrategies.mutate(ids);
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
        selectedFolderId={selectedFolderId}
        onFolderSelect={setSelectedFolderId}
        folderCounts={folderCounts}
        onArchiveDrop={handleArchiveDrop}
      />

      <div className="flex-1 space-y-4 min-w-0">
        {/* Top bar: Title + Sort + Overflow + Upload */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-mono tracking-tight">
              {isArchiveView ? "Archived Strategies" : "Strategies"}
            </h1>
            <p className="text-sm text-muted-foreground">{sorted.length} of {strategies.length} strategies</p>
          </div>
          <div className="flex items-center gap-2">
            <SortDropdown value={sortField} onChange={setSortField} />

            {/* Overflow menu for less-used actions */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-9 w-9">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  disabled={recomputeAll.isPending}
                  onClick={() => recomputeAll.mutate()}
                >
                  <RefreshCw className={`h-4 w-4 mr-2 ${recomputeAll.isPending ? "animate-spin" : ""}`} />
                  {recomputeAll.isPending ? "Recomputing…" : "Recompute All"}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setTagManagerOpen(true)}>
                  <Tags className="h-4 w-4 mr-2" /> Tag Manager
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Link to="/strategies/upload">
              <Button size="sm" className="gap-2"><Plus className="h-4 w-4" /> Upload</Button>
            </Link>
          </div>
        </div>

        {/* Selection action bar */}
        {hasSelection && (
          <div className="flex items-center gap-2 bg-muted/50 border border-border rounded-lg px-4 py-2">
            <span className="text-xs font-mono font-medium text-foreground mr-2">{compareIds.length} selected</span>
            <Button
              variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => setCompareIds(compareIds.length === sorted.length ? [] : sorted.map(({ strategy }) => strategy.id))}
            >
              {compareIds.length === sorted.length ? "Deselect All" : "Select All"}
            </Button>
            <div className="h-4 w-px bg-border" />
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1"
              onClick={() => {
                compareIds.forEach((id) => updateStrategy.mutate({ id, showOnDashboard: true }));
                toast.success(`${compareIds.length} strategies added to dashboard`);
              }}
            >
              <LayoutDashboard className="h-3 w-3" /> Dashboard
            </Button>
            <Button
              variant={compareIds.length >= 2 ? "default" : "ghost"} size="sm" className="text-xs h-7 gap-1"
              onClick={() => compareIds.length >= 2 ? navigate(`/strategies/compare?ids=${compareIds.join(",")}`) : navigate("/strategies/compare")}
            >
              <GitCompareArrows className="h-3 w-3" /> Compare
            </Button>
            <Button
              variant="ghost" size="sm" className="text-xs h-7 gap-1"
              disabled={compareIds.length < 1}
              onClick={() => setPortfolioDialogIds(compareIds)}
            >
              <Briefcase className="h-3 w-3" /> Portfolio
            </Button>

            {/* Move to Folder */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="text-xs h-7 gap-1">
                  <FolderInput className="h-3 w-3" /> Move to Folder
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start">
                <DropdownMenuItem onClick={() => moveToFolder.mutate({ strategyIds: compareIds, folderId: null })}>
                  Uncategorized
                </DropdownMenuItem>
                {folders.length > 0 && <DropdownMenuSeparator />}
                {folders.map((f) => (
                  <DropdownMenuItem key={f.id} onClick={() => moveToFolder.mutate({ strategyIds: compareIds, folderId: f.id })}>
                    <span className="h-2 w-2 rounded-full shrink-0 mr-2" style={{ backgroundColor: f.color }} />
                    {f.name}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <div className="h-4 w-px bg-border" />

            {/* Archive / Restore */}
            {isArchiveView ? (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1"
                onClick={() => { restoreStrategies.mutate(compareIds); setCompareIds([]); }}
              >
                <RotateCcw className="h-3 w-3" /> Restore
              </Button>
            ) : (
              <Button variant="ghost" size="sm" className="text-xs h-7 gap-1"
                onClick={() => { archiveStrategies.mutate(compareIds); setCompareIds([]); }}
              >
                <Archive className="h-3 w-3" /> Archive
              </Button>
            )}

            {/* Delete permanently */}
            <Button variant="ghost" size="sm" className="text-xs h-7 gap-1 text-destructive hover:text-destructive"
              onClick={() => setDeleteConfirmIds(compareIds)}
            >
              <Trash2 className="h-3 w-3" /> Delete
            </Button>

            <Button variant="ghost" size="sm" className="text-xs h-7 ml-auto" onClick={() => setCompareIds([])}>
              <X className="h-3 w-3" />
            </Button>
          </div>
        )}

        {/* Tag manager dialog */}
        <TagManagerDialog open={tagManagerOpen} onOpenChange={setTagManagerOpen} />

        {/* Delete confirmation dialog */}
        <AlertDialog open={deleteConfirmIds.length > 0} onOpenChange={(open) => { if (!open) setDeleteConfirmIds([]); }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Permanently delete {deleteConfirmIds.length} {deleteConfirmIds.length === 1 ? "strategy" : "strategies"}?</AlertDialogTitle>
              <AlertDialogDescription>
                This will delete all trades, equity curves, and tags. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => {
                  deleteStrategies.mutate(deleteConfirmIds);
                  setCompareIds((prev) => prev.filter((id) => !deleteConfirmIds.includes(id)));
                  setDeleteConfirmIds([]);
                }}
              >
                Delete permanently
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

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
                  <div key={s.id} draggable onDragStart={(e: DragEvent<HTMLDivElement>) => {
                    const ids = compareIds.includes(s.id) && compareIds.length > 1 ? compareIds : [s.id];
                    e.dataTransfer.setData("application/strategy-ids", JSON.stringify(ids));
                    e.dataTransfer.effectAllowed = "move";
                  }}>
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
                                  <p className="text-sm font-mono font-bold">{safeFmt(m.profitFactor)}</p>
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

                                {/* Per-card action menu */}
                                <div onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button variant="ghost" size="icon" className="h-7 w-7">
                                        <MoreVertical className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem onClick={() => setPortfolioDialogIds([s.id])}>
                                        <Briefcase className="h-3.5 w-3.5 mr-2" /> Add to Portfolio
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      {isArchiveView ? (
                                        <DropdownMenuItem onClick={() => restoreStrategies.mutate([s.id])}>
                                          <RotateCcw className="h-3.5 w-3.5 mr-2" /> Restore
                                        </DropdownMenuItem>
                                      ) : (
                                        <DropdownMenuItem onClick={() => archiveStrategies.mutate([s.id])}>
                                          <Archive className="h-3.5 w-3.5 mr-2" /> Archive
                                        </DropdownMenuItem>
                                      )}
                                      <DropdownMenuSub>
                                        <DropdownMenuSubTrigger>
                                          <FolderInput className="h-3.5 w-3.5 mr-2" /> Move to Folder
                                        </DropdownMenuSubTrigger>
                                        <DropdownMenuSubContent>
                                          <DropdownMenuItem onClick={() => moveToFolder.mutate({ strategyIds: [s.id], folderId: null })}>
                                            Uncategorized
                                          </DropdownMenuItem>
                                          {folders.length > 0 && <DropdownMenuSeparator />}
                                          {folders.map((f) => (
                                            <DropdownMenuItem key={f.id} onClick={() => moveToFolder.mutate({ strategyIds: [s.id], folderId: f.id })}>
                                              <span className="h-2 w-2 rounded-full shrink-0 mr-2" style={{ backgroundColor: f.color }} />
                                              {f.name}
                                            </DropdownMenuItem>
                                          ))}
                                        </DropdownMenuSubContent>
                                      </DropdownMenuSub>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem className="text-destructive focus:text-destructive" onClick={() => setDeleteConfirmIds([s.id])}>
                                        <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete permanently
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
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

      <AddToPortfolioDialog
        open={portfolioDialogIds.length > 0}
        onOpenChange={(open) => { if (!open) setPortfolioDialogIds([]); }}
        strategyIds={portfolioDialogIds}
      />
    </div>
  );
};

export default Strategies;
