import { useState } from "react";
import { UploadZone } from "@/components/upload/UploadZone";
import { ParseResult } from "@/lib/parsers";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { TradesTable } from "@/components/dashboard/TradesTable";
import { calculateMetrics } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Check, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSaveStrategy } from "@/hooks/use-strategies";

const UploadStrategy = () => {
  const [result, setResult] = useState<ParseResult | null>(null);
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const saveStrategy = useSaveStrategy();

  const handleSave = () => {
    if (!result || !name) return;
    saveStrategy.mutate(
      {
        name,
        trades: result.trades,
        equityCurve: result.equityCurve,
        format: result.format,
      },
      {
        onSuccess: (strategyId) => {
          navigate(`/strategies/${strategyId}`);
        },
      }
    );
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/strategies" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Strategies
        </Link>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Upload Strategy</h1>
        <p className="text-sm text-muted-foreground">Import backtest results from your trading platform</p>
      </div>

      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Strategy Name</CardTitle>
        </CardHeader>
        <CardContent>
          <Input placeholder="e.g. Momentum Alpha v2" value={name} onChange={(e) => setName(e.target.value)} className="max-w-md font-mono" />
        </CardContent>
      </Card>

      <UploadZone strategyId="new" onParsed={setResult} />

      {result && (
        <>
          <div className="flex items-center gap-2 text-sm">
            <Check className="h-4 w-4 text-profit" />
            <span className="font-mono">Parsed {result.trades.length} trades from <span className="text-primary">{result.format}</span> format</span>
            {result.warnings.length > 0 && <span className="text-warning text-xs">({result.warnings.length} warnings)</span>}
          </div>

          <MetricsGrid metrics={calculateMetrics(result.trades, result.equityCurve)} />
          <EquityCurve data={result.equityCurve} title="Preview: Equity Curve" />
          <TradesTable trades={result.trades} />

          <Button className="gap-2" disabled={!name || saveStrategy.isPending} onClick={handleSave}>
            {saveStrategy.isPending ? (
              <><Loader2 className="h-4 w-4 animate-spin" /> Saving...</>
            ) : (
              <><Check className="h-4 w-4" /> Save Strategy</>
            )}
          </Button>
        </>
      )}
    </div>
  );
};

export default UploadStrategy;
