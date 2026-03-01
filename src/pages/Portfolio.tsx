import { useStrategies } from "@/hooks/use-strategies";
import { calculateMetrics } from "@/lib/analytics";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { EquityPoint } from "@/types";
import { Plus, X, Check } from "lucide-react";

const Portfolio = () => {
  const { data: allStrategies = [], isLoading } = useStrategies();
  const [searchParams, setSearchParams] = useSearchParams();

  const [selectedIds, setSelectedIds] = useState<string[]>(() => {
    const ids = searchParams.get("ids");
    return ids ? ids.split(",").filter(Boolean) : [];
  });

  const [weights, setWeights] = useState<Record<string, number>>({});
  const [popoverOpen, setPopoverOpen] = useState(false);

  // Sync URL when selectedIds change
  useEffect(() => {
    if (selectedIds.length > 0) {
      setSearchParams({ ids: selectedIds.join(",") }, { replace: true });
    } else {
      setSearchParams({}, { replace: true });
    }
  }, [selectedIds, setSearchParams]);

  const strategies = useMemo(() => {
    return allStrategies.filter((s) => selectedIds.includes(s.id));
  }, [allStrategies, selectedIds]);

  const availableToAdd = useMemo(() => {
    return allStrategies.filter((s) => !selectedIds.includes(s.id));
  }, [allStrategies, selectedIds]);

  const effectiveWeights = useMemo(() => {
    if (!strategies.length) return {};
    const initial = Object.fromEntries(strategies.map((s) => [s.id, Math.round(100 / strategies.length)]));
    return strategies.reduce((acc, s) => {
      acc[s.id] = weights[s.id] ?? initial[s.id] ?? 0;
      return acc;
    }, {} as Record<string, number>);
  }, [strategies, weights]);

  const updateWeight = (id: string, val: number) => {
    setWeights((prev) => ({ ...prev, [id]: val }));
  };

  const addStrategy = (id: string) => {
    setSelectedIds((prev) => [...prev, id]);
  };

  const removeStrategy = (id: string) => {
    setSelectedIds((prev) => prev.filter((sid) => sid !== id));
    setWeights((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!strategies.length) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Portfolio Builder</h1>
          <p className="text-sm text-muted-foreground">Combine strategies with custom allocation weights</p>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" className="gap-2">
              <Plus className="h-4 w-4" /> Add Strategies
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="start">
            <StrategyPickerList strategies={allStrategies} onSelect={(id) => { addStrategy(id); }} />
          </PopoverContent>
        </Popover>
      </div>
    );
  }

  // Combined equity curve
  const totalWeight = Object.values(effectiveWeights).reduce((a, b) => a + b, 0) || 1;
  const maxLen = Math.max(...strategies.map((s) => s.equityCurve.length));
  const combinedCurve: EquityPoint[] = [];
  for (let i = 0; i < maxLen; i++) {
    let equity = 0;
    let timestamp = "";
    strategies.forEach((s) => {
      const w = (effectiveWeights[s.id] || 0) / totalWeight;
      const point = s.equityCurve[Math.min(i, s.equityCurve.length - 1)];
      if (point) {
        equity += point.equity * w;
        if (!timestamp) timestamp = point.timestamp;
      }
    });
    const peak = Math.max(equity, ...combinedCurve.map((c) => c.equity), equity);
    combinedCurve.push({ timestamp, equity: +equity.toFixed(2), drawdown: +((peak - equity) / peak).toFixed(4) });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-mono tracking-tight">Portfolio Builder</h1>
          <p className="text-sm text-muted-foreground">Combine strategies with custom allocation weights</p>
        </div>
        <Popover open={popoverOpen} onOpenChange={setPopoverOpen}>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Plus className="h-3 w-3" /> Add Strategy
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-72 p-2" align="end">
            <StrategyPickerList strategies={availableToAdd} onSelect={(id) => { addStrategy(id); }} />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {strategies.map((s) => {
          const m = calculateMetrics(s.trades, s.equityCurve);
          return (
            <Card key={s.id} className="bg-card border-border">
              <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-mono">{s.name}</CardTitle>
                <Button variant="ghost" size="icon" className="h-6 w-6 -mr-2" onClick={() => removeStrategy(s.id)}>
                  <X className="h-3 w-3" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Weight</span>
                  <span className="text-sm font-mono font-bold text-primary">{effectiveWeights[s.id] ?? 0}%</span>
                </div>
                <Slider value={[effectiveWeights[s.id] ?? 0]} onValueChange={([v]) => updateWeight(s.id, v)} max={100} step={5} />
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
    </div>
  );
};

function StrategyPickerList({ strategies, onSelect }: { strategies: { id: string; name: string }[]; onSelect: (id: string) => void }) {
  if (strategies.length === 0) {
    return <p className="text-xs text-muted-foreground p-2">No more strategies available</p>;
  }
  return (
    <div className="max-h-60 overflow-y-auto space-y-0.5">
      {strategies.map((s) => (
        <button
          key={s.id}
          className="w-full text-left text-sm px-2 py-1.5 rounded hover:bg-muted transition-colors font-mono truncate"
          onClick={() => onSelect(s.id)}
        >
          {s.name}
        </button>
      ))}
    </div>
  );
}

export default Portfolio;
