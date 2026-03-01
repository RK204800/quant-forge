import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Common futures/instrument to Polygon ticker mapping
const INSTRUMENT_MAP: Record<string, string> = {
  ES: "ES=F",
  NQ: "NQ=F",
  YM: "YM=F",
  RTY: "RTY=F",
  CL: "CL=F",
  GC: "GC=F",
  SI: "SI=F",
  ZB: "ZB=F",
  ZN: "ZN=F",
  "6E": "6E=F",
  EURUSD: "C:EURUSD",
  GBPUSD: "C:GBPUSD",
  USDJPY: "C:USDJPY",
  SPY: "SPY",
  QQQ: "QQQ",
  AAPL: "AAPL",
  MSFT: "MSFT",
  TSLA: "TSLA",
  AMZN: "AMZN",
  GOOG: "GOOG",
  META: "META",
  NVDA: "NVDA",
};

function mapInstrument(raw: string): string {
  const upper = raw.toUpperCase().trim();
  return INSTRUMENT_MAP[upper] || upper;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("POLYGON_API_KEY");
    if (!apiKey) {
      return new Response(JSON.stringify({ error: "POLYGON_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const url = new URL(req.url);
    const instrument = url.searchParams.get("instrument") || "";
    const from = url.searchParams.get("from") || "";
    const to = url.searchParams.get("to") || "";

    if (!instrument || !from || !to) {
      return new Response(JSON.stringify({ error: "Missing instrument, from, or to params" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ticker = mapInstrument(instrument);
    const polygonUrl = `https://api.polygon.io/v2/aggs/ticker/${encodeURIComponent(ticker)}/range/1/minute/${from}/${to}?adjusted=true&sort=asc&limit=50000&apiKey=${apiKey}`;

    const res = await fetch(polygonUrl);
    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ error: `Polygon API error: ${res.status}`, details: body }), {
        status: res.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const candles = (data.results || []).map((r: any) => {
      const d = new Date(r.t);
      const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      return { time: day, open: r.o, high: r.h, low: r.l, close: r.c, volume: r.v };
    });

    // Deduplicate to daily OHLC for lightweight-charts (which expects unique time keys)
    const dailyMap: Record<string, any> = {};
    candles.forEach((c: any) => {
      if (!dailyMap[c.time]) {
        dailyMap[c.time] = { ...c };
      } else {
        dailyMap[c.time].high = Math.max(dailyMap[c.time].high, c.high);
        dailyMap[c.time].low = Math.min(dailyMap[c.time].low, c.low);
        dailyMap[c.time].close = c.close;
        dailyMap[c.time].volume += c.volume;
      }
    });

    const dailyCandles = Object.values(dailyMap).sort((a: any, b: any) => a.time.localeCompare(b.time));

    return new Response(JSON.stringify({ candles: dailyCandles, ticker, count: dailyCandles.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
