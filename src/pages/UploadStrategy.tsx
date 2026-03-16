import { useState, useCallback } from "react";
import { UploadZone, ParsedFile } from "@/components/upload/UploadZone";
import { ParseResult, extractHeaders } from "@/lib/parsers";
import { MetricsGrid } from "@/components/dashboard/MetricsGrid";
import { EquityCurve } from "@/components/dashboard/EquityCurve";
import { ColumnMapper } from "@/components/upload/ColumnMapper";
import { calculateMetrics } from "@/lib/analytics";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Check, Loader2, X, ChevronDown, ChevronRight, GripVertical, RefreshCw } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { useSaveStrategy } from "@/hooks/use-strategies";

interface QueueItem {
  id: string;
  result: ParseResult;
  fileName: string;
  name: string;
  status: "pending" | "saving" | "saved" | "error";
  error?: string;
  rawContent?: string;
  headers?: string[];
  sampleRows?: Record<string, string>[];
}

function fileNameToStrategyName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

const UploadStrategy = () => {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dragOverId, setDragOverId] = useState<string | null>(null);
  const [remapId, setRemapId] = useState<string | null>(null);
  const navigate = useNavigate();
  const saveStrategy = useSaveStrategy();

  const handleParsed = useCallback((files: ParsedFile[]) => {
    const newItems: QueueItem[] = files.map((f) => ({
      id: crypto.randomUUID(),
      result: f.result,
      fileName: f.fileName,
      name: fileNameToStrategyName(f.fileName),
      status: "pending",
      rawContent: f.rawContent,
      headers: f.headers,
      sampleRows: f.sampleRows,
    }));
    setQueue((prev) => [...prev, ...newItems]);
  }, []);

  const removeItem = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
    if (expandedId === id) setExpandedId(null);
    if (remapId === id) setRemapId(null);
  };

  const updateName = (id: string, name: string) => {
    setQueue((prev) => prev.map((item) => (item.id === id ? { ...item, name } : item)));
  };

  const handleRemap = (id: string) => {
    const item = queue.find((q) => q.id === id);
    if (!item?.rawContent) return;
    // Ensure headers are available
    if (!item.headers || item.headers.length === 0) {
      const { headers, sampleRows } = extractHeaders(item.rawContent);
      setQueue((prev) => prev.map((q) => q.id === id ? { ...q, headers, sampleRows } : q));
    }
    setRemapId(id);
  };

  const handleRemapped = (id: string, result: ParseResult) => {
    setQueue((prev) => prev.map((q) => q.id === id ? { ...q, result, status: "pending" } : q));
    setRemapId(null);
  };

  const handleDragStart = (id: string) => {
    setDraggedId(id);
  };

  const handleDragOver = (e: React.DragEvent, id: string) => {
    e.preventDefault();
    if (draggedId && draggedId !== id) setDragOverId(id);
  };

  const handleDrop = (targetId: string) => {
    if (!draggedId || draggedId === targetId) {
      setDraggedId(null);
      setDragOverId(null);
      return;
    }
    setQueue((prev) => {
      const fromIndex = prev.findIndex((q) => q.id === draggedId);
      const toIndex = prev.findIndex((q) => q.id === targetId);
      if (fromIndex === -1 || toIndex === -1) return prev;
      const next = [...prev];
      const [moved] = next.splice(fromIndex, 1);
      next.splice(toIndex, 0, moved);
      return next;
    });
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleDragEnd = () => {
    setDraggedId(null);
    setDragOverId(null);
  };

  const handleSaveAll = async () => {
    const pending = queue.filter((item) => item.status === "pending");
    if (pending.length === 0) return;

    setSaving(true);
    setSaveProgress({ current: 0, total: pending.length });

    let allSucceeded = true;
    for (let i = 0; i < pending.length; i++) {
      const item = pending[i];
      setSaveProgress({ current: i + 1, total: pending.length });
      setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "saving" } : q)));

      try {
        await new Promise<void>((resolve, reject) => {
          saveStrategy.mutate(
            { name: item.name, trades: item.result.trades, equityCurve: item.result.equityCurve, format: item.result.format },
            {
              onSuccess: () => {
                setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "saved" } : q)));
                resolve();
              },
              onError: (err) => {
                setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: err.message } : q)));
                reject(err);
              },
            }
          );
        });
      } catch {
        allSucceeded = false;
      }
    }

    setSaving(false);
    if (allSucceeded) {
      navigate("/strategies");
    }
  };

  const pendingCount = queue.filter((q) => q.status === "pending").length;
  const remapItem = remapId ? queue.find((q) => q.id === remapId) : null;

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <Link to="/strategies" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1 mb-2">
          <ArrowLeft className="h-3 w-3" /> Back to Strategies
        </Link>
        <h1 className="text-2xl font-bold font-mono tracking-tight">Upload Strategies</h1>
        <p className="text-sm text-muted-foreground">Import backtest results from your trading platform</p>
      </div>

      <UploadZone strategyId="new" onParsed={handleParsed} />

      {remapItem && remapItem.rawContent && remapItem.headers && remapItem.headers.length > 0 && (
        <ColumnMapper
          headers={remapItem.headers}
          sampleRows={remapItem.sampleRows || []}
          rawContent={remapItem.rawContent}
          fileName={remapItem.fileName}
          strategyId="new"
          onMapped={(result) => handleRemapped(remapItem.id, result)}
          onCancel={() => setRemapId(null)}
        />
      )}

      {queue.length > 0 && (
        <Card className="bg-card border-border">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-mono font-medium">Queue ({queue.length} {queue.length === 1 ? "file" : "files"})</p>
              <Button size="sm" className="gap-2" disabled={pendingCount === 0 || saving} onClick={handleSaveAll}>
                {saving ? (
                  <><Loader2 className="h-3 w-3 animate-spin" /> Saving {saveProgress.current}/{saveProgress.total}…</>
                ) : (
                  <><Check className="h-3 w-3" /> Save All</>
                )}
              </Button>
            </div>

            <div className="space-y-2">
              {queue.map((item) => {
                const isExpanded = expandedId === item.id;
                return (
                  <div
                    key={item.id}
                    className={`border rounded-md overflow-hidden transition-all ${
                      draggedId === item.id ? "opacity-40 border-primary" : dragOverId === item.id ? "border-primary bg-primary/5" : "border-border"
                    }`}
                    draggable={!saving}
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={() => handleDrop(item.id)}
                    onDragEnd={handleDragEnd}
                  >
                    <div
                      className="flex items-center gap-3 p-3 cursor-pointer hover:bg-muted/50 transition-colors"
                      onClick={() => setExpandedId(isExpanded ? null : item.id)}
                    >
                      <GripVertical className="h-3 w-3 text-muted-foreground shrink-0 cursor-grab active:cursor-grabbing" />
                      {isExpanded ? <ChevronDown className="h-3 w-3 text-muted-foreground shrink-0" /> : <ChevronRight className="h-3 w-3 text-muted-foreground shrink-0" />}

                      <span className="text-xs text-muted-foreground font-mono truncate w-36 shrink-0">{item.fileName}</span>
                      <Badge variant="secondary" className="text-[10px] shrink-0">{item.result.format}</Badge>
                      <span className="text-xs text-muted-foreground shrink-0">{item.result.trades.length} trades</span>

                      <div className="flex-1 min-w-0" onClick={(e) => e.stopPropagation()}>
                        <Input value={item.name} onChange={(e) => updateName(item.id, e.target.value)} className="h-7 text-xs font-mono" disabled={item.status !== "pending"} />
                      </div>

                      {item.status === "saving" && <Loader2 className="h-4 w-4 animate-spin text-primary shrink-0" />}
                      {item.status === "saved" && <Check className="h-4 w-4 text-profit shrink-0" />}
                      {item.status === "error" && <span className="text-xs text-loss shrink-0" title={item.error}>Error</span>}

                      {item.status === "pending" && item.rawContent && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 shrink-0"
                          title="Re-map columns"
                          onClick={(e) => { e.stopPropagation(); handleRemap(item.id); }}
                        >
                          <RefreshCw className="h-3 w-3" />
                        </Button>
                      )}

                      {item.status === "pending" && (
                        <Button variant="ghost" size="icon" className="h-6 w-6 shrink-0" onClick={(e) => { e.stopPropagation(); removeItem(item.id); }}>
                          <X className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {isExpanded && (
                      <div className="p-4 border-t border-border space-y-4 bg-muted/30">
                        <MetricsGrid metrics={calculateMetrics(item.result.trades, item.result.equityCurve)} />
                        <EquityCurve data={item.result.equityCurve} title={`Preview: ${item.name}`} />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default UploadStrategy;
