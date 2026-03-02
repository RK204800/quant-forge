import { useParams, Link } from "react-router-dom";
import { usePortfolio, useUpdatePortfolio, useUpdateWeight, useRemoveFromPortfolio, useAddToPortfolio, useDeletePortfolio } from "@/hooks/use-portfolios";
import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { EquityPoint } from "@/types";
import { useState, useMemo } from "react";
import { ArrowLeft, Plus, X, Pencil, Check, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const PortfolioDetail = () => {
  const { id } = useParams();
  const { data: portfolio, isLoading: pLoading } = usePortfolio(id);
  const { data: allStrategies = [], isLoading: sLoading } = useStrategies();
  const updatePortfolio = useUpdatePortfolio();
  const updateWeight = useUpdateWeight();
  const removeFromPortfolio = useRemoveFromPortfolio();
  const addToPortfolio = useAddToPortfolio();
  const deletePortfolio = useDeletePortfolio();
  const navigate = useNavigate();

  const [editingName, setEditingName] = useState(false);
  const [nameInput, setNameInput] = useState("");
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  const isLoading = pLoading || sLoading;

  const memberStrategies = useMemo(() => {
    if (!portfolio) return [];
    return portfolio.strategies
      .map((ps) => {
        const s = allStrategies.find((st) => st.id === ps.strategyId);
        return s ? { ...s, weight: ps.weight } : null;
      })
      .filter(Boolean) as (typeof allStrategies[0] & { weight: number })[];
  }, [portfolio, allStrategies]);

  const availableToAdd = useMemo(() => {
    if (!portfolio) return allStrategies;
    const memberIds = new Set(portfolio.strategies.map((ps) => ps.strategyId));
    return allStrategies.filter((s) => !memberIds.has(s.id));
  }, [portfolio, allStrategies]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!portfolio) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground font-mono">Portfolio not found</p>
      </div>
    );
  }

  // Combined equity curve
  const totalWeight = memberStrategies.reduce((a, s) => a + s.weight, 0) || 1;
  const maxLen = Math.max(0, ...memberStrategies.map((s) => s.equityCurve.length));
  const combinedCurve: EquityPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    let equity = 0;
    let timestamp = "";
    memberStrategies.forEach((s) => {
      const w = s.weight / totalWeight;
      const point = s.equityCurve[Math.min(i, s.equityCurve.length - 1)];
      if (point) {
        equity += point.equity * w;
        if (!timestamp) timestamp = point.timestamp;
      }
    });
    const peak = Math.max(equity, ...combinedCurve.map((c) => c.equity), equity);
    combinedCurve.push({ timestamp, equity: +equity.toFixed(2), drawdown: +((peak - equity) / peak).toFixed(4) });
  }

  const startEditName = () => {
    setNameInput(portfolio.name);
    setEditingName(true);
  };

  const saveName = () => {
    if (nameInput.trim() && nameInput.trim() !== portfolio.name) {
      updatePortfolio.mutate({ id: portfolio.id, name: nameInput.trim() });
    }
    setEditingName(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <Link to="/portfolio" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Portfolios
        </Link>
        <div className="flex items-center gap-3">
          {editingName ? (
            <div className="flex items-center gap-2">
              <Input value={nameInput} onChange={(e) => setNameInput(e.target.value)} onKeyDown={(e) => e.key === "Enter" && saveName()} className="h-9 text-lg font-bold font-mono w-64" autoFocus />
              <Button size="sm" onClick={saveName}><Check className="h-3 w-3" /></Button>
              <Button size="sm" variant="ghost" onClick={() => setEditingName(false)}><X className="h-3 w-3" /></Button>
            </div>
          ) : (
            <>
              <h1 className="text-2xl font-bold font-mono tracking-tight">{portfolio.name}</h1>
              <button onClick={startEditName}><Pencil className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" /></button>
            </>
          )}
          <div className="ml-auto flex items-center gap-2">
            <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-2 text-xs font-mono">
                  <Plus className="h-3 w-3" /> Add Strategy
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-72 p-2" align="end">
                {availableToAdd.length === 0 ? (
                  <p className="text-xs text-muted-foreground p-2">No more strategies available</p>
                ) : (
                  <div className="max-h-60 overflow-y-auto space-y-0.5">
                    {availableToAdd.map((s) => (
                      <button
                        key={s.id}
                        className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors font-mono truncate"
                        onClick={() => {
                          addToPortfolio.mutate({ portfolioId: portfolio.id, strategyIds: [s.id] });
                          setPopoverOpen(false);
                        }}
                      >
                        {s.name}
                      </button>
                    ))}
                  </div>
                )}
              </PopoverContent>
            </Popover>
            <Button variant="outline" size="sm" className="gap-2 text-xs font-mono text-destructive hover:text-destructive" onClick={() => setDeleteOpen(true)}>
              <Trash2 className="h-3 w-3" /> Delete
            </Button>
          </div>
        </div>
      </div>

      {memberStrategies.length === 0 ? (
        <Card className="bg-card border-border">
          <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
            <p className="text-muted-foreground font-mono text-sm">No strategies in this portfolio yet.</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {memberStrategies.map((s) => {
              const m = calculateMetrics(s.trades, s.equityCurve);
              return (
                <Card key={s.id} className="bg-card border-border">
                  <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                    <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
                    <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => removeFromPortfolio.mutate({ portfolioId: portfolio.id, strategyId: s.id })}>
                      <X className="h-3 w-3" />
                    </Button>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-muted-foreground">Weight</span>
                      <span className="text-sm font-mono font-bold text-primary">{s.weight}%</span>
                    </div>
                    <Slider
                      value={[s.weight]}
                      onValueChange={([v]) => updateWeight.mutate({ portfolioId: portfolio.id, strategyId: s.id, weight: v })}
                      max={100}
                      step={5}
                    />
                    <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                      <div>
                        <span className="text-muted-foreground">Return</span>
                        <p className={m.totalReturn >= 0 ? "text-profit" : "text-loss"}>${m.totalReturn.toLocaleString(undefined, { maximumFractionDigits: 0 })}</p>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Sharpe</span>
                        <p>{m.sharpeRatio.toFixed(2)}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
          <EquityCurve data={combinedCurve} title="Combined Portfolio Equity" />
        </>
      )}

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{portfolio.name}"?</AlertDialogTitle>
            <AlertDialogDescription>This will permanently delete this portfolio. Your strategies will not be affected.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction className="bg-destructive text-destructive-foreground hover:bg-destructive/90" onClick={() => { deletePortfolio.mutate(portfolio.id); navigate("/portfolio"); }}>
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default PortfolioDetail;
