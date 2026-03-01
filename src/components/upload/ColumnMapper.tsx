import { useState, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle } from "lucide-react";
import { TradeField, ColumnMapping } from "@/types";
import { parseWithMapping } from "@/lib/parsers/mapped";
import { ParseResult } from "@/lib/parsers";

const TRADE_FIELDS: { value: TradeField; label: string; required?: boolean }[] = [
  { value: "skip", label: "— Skip —" },
  { value: "entryTime", label: "Entry Date/Time", required: true },
  { value: "exitTime", label: "Exit Date/Time" },
  { value: "direction", label: "Direction (Long/Short)" },
  { value: "entryPrice", label: "Entry Price" },
  { value: "exitPrice", label: "Exit Price" },
  { value: "pnl", label: "PnL / Profit" },
  { value: "quantity", label: "Quantity / Contracts" },
  { value: "instrument", label: "Instrument / Symbol" },
  { value: "commission", label: "Commission" },
  { value: "mae", label: "MAE (Max Adverse)" },
  { value: "mfe", label: "MFE (Max Favorable)" },
  { value: "tradeNumber", label: "Trade # (group rows)" },
];

interface ColumnMapperProps {
  headers: string[];
  sampleRows: Record<string, string>[];
  rawContent: string;
  fileName: string;
  strategyId: string;
  onMapped: (result: ParseResult) => void;
  onCancel: () => void;
}

export function ColumnMapper({ headers, sampleRows, rawContent, fileName, strategyId, onMapped, onCancel }: ColumnMapperProps) {
  const [mapping, setMapping] = useState<ColumnMapping>(() => {
    const init: ColumnMapping = {};
    headers.forEach((h) => { init[h] = "skip"; });
    return init;
  });
  const [error, setError] = useState<string | null>(null);

  const hasEntryTime = useMemo(
    () => Object.values(mapping).includes("entryTime"),
    [mapping]
  );

  // Check for duplicate field assignments (excluding skip)
  const duplicates = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const field of Object.values(mapping)) {
      if (field === "skip") continue;
      counts[field] = (counts[field] || 0) + 1;
    }
    return new Set(Object.keys(counts).filter((k) => counts[k] > 1));
  }, [mapping]);

  const handleApply = () => {
    setError(null);
    try {
      const result = parseWithMapping(rawContent, strategyId, mapping);
      if (result.trades.length === 0) {
        setError(result.warnings.join("; ") || "No trades could be parsed with this mapping");
        return;
      }
      onMapped(result);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to parse");
    }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-sm font-mono">Map Columns: {fileName}</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Auto-detection failed. Map your CSV columns to trade fields below.
            </p>
          </div>
          <Button variant="ghost" size="sm" onClick={onCancel} className="text-xs">Cancel</Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid gap-2">
          {headers.map((header) => (
            <div key={header} className="flex items-center gap-3 py-1.5 px-2 rounded bg-muted/30">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-mono font-medium truncate">{header}</p>
                <p className="text-[10px] text-muted-foreground truncate">
                  {sampleRows.map((r) => r[header]).filter(Boolean).join(" · ")}
                </p>
              </div>
              <Select
                value={mapping[header]}
                onValueChange={(val) => setMapping((prev) => ({ ...prev, [header]: val as TradeField }))}
              >
                <SelectTrigger className="w-48 h-7 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TRADE_FIELDS.map((f) => (
                    <SelectItem key={f.value} value={f.value} className="text-xs">
                      {f.label}
                      {f.required && <Badge variant="destructive" className="ml-1 text-[9px] px-1 py-0">Required</Badge>}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>

        {duplicates.size > 0 && (
          <p className="text-xs text-loss flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            Duplicate mappings: {Array.from(duplicates).join(", ")}
          </p>
        )}

        {error && (
          <p className="text-xs text-loss flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Button
            size="sm"
            className="gap-1"
            disabled={!hasEntryTime || duplicates.size > 0}
            onClick={handleApply}
          >
            <Check className="h-3 w-3" /> Apply Mapping ({headers.length} columns)
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
