import { useCallback, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, AlertCircle } from "lucide-react";
import { parseFile } from "@/lib/parsers";
import { ParseResult } from "@/lib/parsers";

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
