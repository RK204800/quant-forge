import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, AlertCircle, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { parseFile } from "@/lib/parsers";
import { ParseResult } from "@/lib/parsers";
import { xlsxToCSV, isExcelFile } from "@/lib/parsers/xlsx-reader";

const SAMPLE_CSV = `ticker,entry_date,exit_date,direction,entry_price,exit_price,size,pnl,commission
SPY,2025-01-02T10:00:00,2025-01-02T15:30:00,long,475.50,478.20,100,270,4.50
AAPL,2025-01-03T09:30:00,2025-01-03T14:00:00,short,182.00,179.50,50,125,3.00
TSLA,2025-01-06T10:15:00,2025-01-06T16:00:00,long,248.00,245.30,30,-81,2.50`;

const SAMPLE_TV_CSV = `Trade #,Type,Signal,Date/Time,Price,Contracts,Profit,Cum. Profit,Run-up,Drawdown
1,Entry Long,Buy,2025-01-02 10:00,475.50,100,,,,
1,Exit Long,Sell,2025-01-02 15:30,478.20,100,270,270,300,10
2,Entry Short,Sell,2025-01-03 09:30,182.00,50,,,,
2,Exit Short,Buy,2025-01-03 14:00,179.50,50,125,395,130,5
3,Entry Long,Buy,2025-01-06 10:15,248.00,30,,,,
3,Exit Long,Sell,2025-01-06 16:00,245.30,30,-81,314,20,90`;

function downloadSample(content: string, filename: string) {
  const blob = new Blob([content], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export interface ParsedFile {
  result: ParseResult;
  fileName: string;
}

interface UploadZoneProps {
  strategyId: string;
  onParsed: (files: ParsedFile[]) => void;
}

export function UploadZone({ strategyId, onParsed }: UploadZoneProps) {
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFiles = useCallback(async (fileList: FileList) => {
    setError(null);
    const files = Array.from(fileList);
    const results: ParsedFile[] = [];
    const errors: string[] = [];

    await Promise.all(
      files.map(async (file) => {
        try {
          let text: string;
          if (isExcelFile(file.name)) {
            const buffer = await file.arrayBuffer();
            text = await xlsxToCSV(buffer);
          } else {
            text = await file.text();
          }
          const result = parseFile(text, file.name, strategyId);
          if (result.trades.length === 0) {
            const detail = result.warnings.length > 0
              ? ` (${result.format} format — ${result.warnings.slice(0, 2).join("; ")})`
              : ` (detected as ${result.format})`;
            errors.push(`${file.name}: No trades found${detail}`);
            return;
          }
          results.push({ result, fileName: file.name });
        } catch {
          errors.push(`${file.name}: Failed to parse`);
        }
      })
    );

    if (results.length > 0) {
      onParsed(results);
    }
    if (errors.length > 0) {
      setError(errors.join("; "));
    }
  }, [strategyId, onParsed]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files.length > 0) handleFiles(e.dataTransfer.files);
  }, [handleFiles]);

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
          input.accept = ".csv,.json,.txt,.xlsx,.xls";
          input.multiple = true;
          input.onchange = (e) => {
            const files = (e.target as HTMLInputElement).files;
            if (files && files.length > 0) handleFiles(files);
          };
          input.click();
        }}
      >
        <Upload className={`h-10 w-10 ${dragOver ? "text-primary" : "text-muted-foreground"}`} />
        <div className="text-center">
          <p className="text-sm font-medium text-foreground">Drop backtest files here or click to browse</p>
          <p className="text-xs text-muted-foreground mt-1">Supports multiple files · Backtrader, NinjaTrader, QuantConnect, TradingView, Generic CSV</p>
          <div className="flex gap-2 mt-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); downloadSample(SAMPLE_CSV, "sample_backtest.csv"); }}
            >
              <Download className="h-3 w-3" /> Generic CSV
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="gap-1 text-xs text-muted-foreground hover:text-foreground"
              onClick={(e) => { e.stopPropagation(); downloadSample(SAMPLE_TV_CSV, "sample_tradingview.csv"); }}
            >
              <Download className="h-3 w-3" /> TradingView CSV
            </Button>
          </div>
        </div>
        {error && (
          <div className="flex items-center gap-2 text-xs text-loss">
            <AlertCircle className="h-3 w-3" /> {error}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
