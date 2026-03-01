import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, CandlestickData, Time, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trade } from "@/types";
import { Loader2, AlertCircle } from "lucide-react";

interface TradeChartProps {
  trades: Trade[];
  instrument: string;
}

interface CandleData {
  time: Time;
  open: number;
  high: number;
  low: number;
  close: number;
}

export function TradeChart({ trades, instrument }: TradeChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [candles, setCandles] = useState<CandleData[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"candles" | "markers-only">("markers-only");

  // Generate synthetic candles from trade prices for markers-only mode
  useEffect(() => {
    if (trades.length === 0) return;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
    const syntheticCandles: CandleData[] = [];
    const seen = new Set<string>();

    sortedTrades.forEach((t) => {
      const addPoint = (time: string, price: number) => {
        const d = new Date(time);
        const dayKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
        if (seen.has(dayKey)) {
          // Update existing candle
          const existing = syntheticCandles.find((c) => String(c.time) === dayKey);
          if (existing) {
            existing.high = Math.max(existing.high, price);
            existing.low = Math.min(existing.low, price);
            existing.close = price;
          }
        } else {
          seen.add(dayKey);
          syntheticCandles.push({ time: dayKey as Time, open: price, high: price, low: price, close: price });
        }
      };
      addPoint(t.entryTime, t.entryPrice);
      addPoint(t.exitTime, t.exitPrice);
    });

    syntheticCandles.sort((a, b) => String(a.time).localeCompare(String(b.time)));
    setCandles(syntheticCandles);
  }, [trades]);

  // Fetch candles from Polygon via edge function
  const fetchCandles = async () => {
    if (trades.length === 0) return;
    setLoading(true);
    setError(null);

    try {
      const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
      const from = sortedTrades[0].entryTime.split("T")[0];
      const to = sortedTrades[sortedTrades.length - 1].exitTime.split("T")[0];

      const projectId = import.meta.env.VITE_SUPABASE_PROJECT_ID;
      const res = await fetch(
        `https://${projectId}.supabase.co/functions/v1/market-data?instrument=${encodeURIComponent(instrument)}&from=${from}&to=${to}`,
        { headers: { "Content-Type": "application/json", apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY } }
      );

      if (!res.ok) {
        const body = await res.text();
        throw new Error(body || `HTTP ${res.status}`);
      }

      const data = await res.json();
      if (data.candles && data.candles.length > 0) {
        setCandles(data.candles.map((c: any) => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
        setMode("candles");
      } else {
        setError("No candle data returned. Showing trade markers on synthetic price line.");
      }
    } catch (err: any) {
      setError(err.message || "Failed to fetch candle data");
    } finally {
      setLoading(false);
    }
  };

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

    // Clean up old chart
    if (chartRef.current) {
      chartRef.current.remove();
      chartRef.current = null;
    }

    const chart = createChart(chartContainerRef.current, {
      layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "hsl(var(--foreground))" },
      grid: { vertLines: { color: "hsl(var(--border))" }, horzLines: { color: "hsl(var(--border))" } },
      width: chartContainerRef.current.clientWidth,
      height: 500,
      crosshair: { mode: 0 },
      timeScale: { borderColor: "hsl(var(--border))" },
      rightPriceScale: { borderColor: "hsl(var(--border))" },
    });

    chartRef.current = chart;

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: "#22c55e",
      downColor: "#ef4444",
      borderDownColor: "#ef4444",
      borderUpColor: "#22c55e",
      wickDownColor: "#ef4444",
      wickUpColor: "#22c55e",
    });

    candleSeries.setData(candles as CandlestickData<Time>[]);

    // Add trade markers
    const markers = trades
      .flatMap((t) => {
        const entryDate = new Date(t.entryTime);
        const exitDate = new Date(t.exitTime);
        const entryDay = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}-${String(entryDate.getDate()).padStart(2, "0")}`;
        const exitDay = `${exitDate.getFullYear()}-${String(exitDate.getMonth() + 1).padStart(2, "0")}-${String(exitDate.getDate()).padStart(2, "0")}`;

        return [
          {
            time: entryDay as Time,
            position: t.direction === "long" ? "belowBar" as const : "aboveBar" as const,
            color: t.direction === "long" ? "#22c55e" : "#ef4444",
            shape: t.direction === "long" ? "arrowUp" as const : "arrowDown" as const,
            text: `${t.direction === "long" ? "▲" : "▼"} ${t.entryPrice.toFixed(2)}`,
          },
          {
            time: exitDay as Time,
            position: "inBar" as const,
            color: "#a855f7",
            shape: "circle" as const,
            text: `✕ ${t.exitPrice.toFixed(2)}`,
          },
        ];
      })
      .sort((a, b) => String(a.time).localeCompare(String(b.time)));

    createSeriesMarkers(candleSeries, markers);
    chart.timeScale().fitContent();

    const handleResize = () => {
      if (chartContainerRef.current) chart.applyOptions({ width: chartContainerRef.current.clientWidth });
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
      chart.remove();
      chartRef.current = null;
    };
  }, [candles, trades]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2 flex flex-row items-center justify-between">
        <CardTitle className="text-sm font-mono">Trade Chart — {instrument}</CardTitle>
        <div className="flex items-center gap-2">
          {mode === "markers-only" && (
            <Button variant="outline" size="sm" className="h-7 text-[10px] font-mono gap-1" onClick={fetchCandles} disabled={loading}>
              {loading ? <Loader2 className="h-3 w-3 animate-spin" /> : null}
              Load 1m Candles
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground mb-2">
            <AlertCircle className="h-3 w-3 text-yellow-500" />
            {error}
          </div>
        )}
        <div ref={chartContainerRef} className="w-full" />
        {candles.length === 0 && !loading && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-mono">
            No trade data to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
