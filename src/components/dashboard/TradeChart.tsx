import { useEffect, useRef, useState } from "react";
import { createChart, ColorType, IChartApi, CandlestickData, Time, CandlestickSeries, createSeriesMarkers } from "lightweight-charts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/types";
import { getESTDateKey } from "@/lib/timezone";

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

  // Generate synthetic candles from trade prices
  useEffect(() => {
    if (trades.length === 0) return;

    const sortedTrades = [...trades].sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());
    const syntheticCandles: CandleData[] = [];
    const seen = new Set<string>();

    sortedTrades.forEach((t) => {
      const addPoint = (time: string, price: number) => {
        const dayKey = getESTDateKey(time);
        if (seen.has(dayKey)) {
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

  // Render chart
  useEffect(() => {
    if (!chartContainerRef.current || candles.length === 0) return;

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
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">Trade Chart — {instrument}</CardTitle>
      </CardHeader>
      <CardContent>
        <div ref={chartContainerRef} className="w-full" />
        {candles.length === 0 && (
          <div className="flex items-center justify-center h-48 text-muted-foreground text-sm font-mono">
            No trade data to display
          </div>
        )}
      </CardContent>
    </Card>
  );
}
