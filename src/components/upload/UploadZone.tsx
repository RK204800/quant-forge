import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFile } from "@/lib/parsers";
import { ParseResult } from "@/lib/parsers";

const SAMPLE_CSV = `ticker,entry_date,exit_date,direction,entry_price,exit_price,size,pnl,commission
SPY,2025-01-02T10:00:00,2025-01-02T15:30:00,long,475.50,478.20,100,270,4.50
AAPL,2025-01-03T09:30:00,2025-01-03T14:00:00,short,182.00,179.50,50,125,3.00
TSLA,2025-01-06T10:15:00,2025-01-06T16:00:00,long,248.00,245.30,30,-81,2.50`;

function downloadSampleCSV() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "sample_backtest.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface UploadZoneProps {
  strategyId: string;
  onParsed: (result: ParseResult) => void;
}

export function UploadZone({ strategyId, onParsed }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result = parseFile(text, file.name, strategyId);
      if (result.trades.length === 0) {
        setError("No trades found. Check the file format.");
        return;
      }
      onParsed(result);
    } catch (e) {
      setError("Failed to parse file. Please check the format.");
    }
  }, [strategyId, onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  return (
    <Card className={`bg-card border-2 border-dashed transition-colors cursor-pointer ${dragOver ? "border-primary bg-primary/5" : "border-border hover:border-muted-foreground"}`}>
      <CardContent
        className="flex flex-col items-center justify-center py-12 gap-4"
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        onClick={() => {
          const input = document.createElement("input");
          input.type = "file";
          input.accept = ".csv,.json,.txt";
          input.onchange = (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) handleFile(file);
          };
          input.click();
        }}
      >
        <Upload className={`h-10 w-10 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Drop backtest file here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Supports Backtrader CSV, NinjaTrader, QuantConnect JSON, Generic CSV</p>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="mt-2 gap-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={(e) => { e.stopPropagation(); downloadSampleCSV(); }}
          >
            <Download className="h-3 w-3" /> Download sample CSV
          </Button>
        </div>
        {fileName && !error && (
          <div className="flex items-center gap-2 text-xs text-primary">
            <FileText className="h-3 w-3" /> {fileName}
          </div>
        )}
        {error && (
          <div className="flex items-center gap-2 text-xs text-loss">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
