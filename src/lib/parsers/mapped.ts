import { Trade, EquityPoint, ColumnMapping } from "@/types";
import { ParseResult } from "./index";
import { safeFloat, normalizeDateTime, computePnl } from "./utils";

export function parseWithMapping(
  content: string,
  strategyId: string,
  mapping: ColumnMapping
): ParseResult {
  const warnings: string[] = [];
  const clean = content.replace(/^\uFEFF/, "").replace(/^sep=.\r?\n/i, "");
  const lines = clean.split(/\r?\n/).filter(Boolean);
  if (lines.length < 2) return { trades: [], equityCurve: [], format: "mapped", warnings: ["No data rows found"] };

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, ""));

  // Build reverse map: tradeField -> column index
  const fieldToIdx: Partial<Record<string, number>> = {};
  for (const [csvHeader, field] of Object.entries(mapping)) {
    if (field === "skip") continue;
    const idx = headers.findIndex((h) => h === csvHeader);
    if (idx >= 0) fieldToIdx[field] = idx;
  }

  if (fieldToIdx["entryTime"] === undefined) {
    return { trades: [], equityCurve: [], format: "mapped", warnings: ["Entry Date/Time must be mapped"] };
  }

  const getVal = (vals: string[], field: string): string => {
    const idx = fieldToIdx[field];
    return idx !== undefined ? (vals[idx] ?? "").trim().replace(/^"|"$/g, "") : "";
  };

  // Parse rows
  const rows: Record<string, string>[] = [];
  for (let i = 1; i < lines.length; i++) {
    const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = vals[idx] ?? ""; });
    row.__vals = lines[i]; // keep raw for getVal
    rows.push(row);
  }

  const hasTradeNumber = fieldToIdx["tradeNumber"] !== undefined;
  const trades: Trade[] = [];

  if (hasTradeNumber) {
    // Group by trade number, pair entry/exit
    const groups = new Map<string, string[][]>();
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      const tradeNum = getVal(vals, "tradeNumber");
      if (!tradeNum) continue;
      if (!groups.has(tradeNum)) groups.set(tradeNum, []);
      groups.get(tradeNum)!.push(vals);
    }

    for (const [tradeNum, groupVals] of groups) {
      if (groupVals.length < 2) {
        // Single row trade - treat as flat
        const vals = groupVals[0];
        const trade = buildTrade(vals, strategyId, trades.length, getVal, fieldToIdx, warnings);
        if (trade) trades.push(trade);
        continue;
      }
      // First row = entry, last row = exit
      const entryVals = groupVals[0];
      const exitVals = groupVals[groupVals.length - 1];
      const trade = buildPairedTrade(entryVals, exitVals, strategyId, trades.length, getVal, fieldToIdx, warnings);
      if (trade) trades.push(trade);
    }
  } else {
    // Flat: each row is one complete trade
    for (let i = 1; i < lines.length; i++) {
      const vals = lines[i].split(",").map((v) => v.trim().replace(/^"|"$/g, ""));
      if (vals.every((v) => !v)) continue;
      const trade = buildTrade(vals, strategyId, trades.length, getVal, fieldToIdx, warnings);
      if (trade) trades.push(trade);
    }
  }

  // Sort by entry time
  trades.sort((a, b) => new Date(a.entryTime).getTime() - new Date(b.entryTime).getTime());

  // Build equity curve
  const equityCurve: EquityPoint[] = [];
  let cumPnl = 0;
  let peak = 0;
  for (const t of trades) {
    cumPnl += t.pnlNet;
    peak = Math.max(peak, cumPnl);
    equityCurve.push({
      timestamp: t.exitTime,
      equity: cumPnl,
      drawdown: peak > 0 ? ((peak - cumPnl) / peak) * 100 : 0,
    });
  }

  return { trades, equityCurve, format: "mapped", warnings };
}

function buildTrade(
  vals: string[],
  strategyId: string,
  index: number,
  getVal: (vals: string[], field: string) => string,
  fieldToIdx: Partial<Record<string, number>>,
  warnings: string[]
): Trade | null {
  const entryTimeRaw = getVal(vals, "entryTime");
  const entryTime = normalizeDateTime(entryTimeRaw);
  if (!entryTime) return null;

  const exitTimeRaw = getVal(vals, "exitTime");
  const exitTime = normalizeDateTime(exitTimeRaw) ?? entryTime;

  const dirRaw = getVal(vals, "direction").toLowerCase();
  const direction: "long" | "short" = dirRaw.includes("short") || dirRaw.includes("sell") ? "short" : "long";

  const entryPrice = safeFloat(getVal(vals, "entryPrice"), 0);
  const exitPrice = safeFloat(getVal(vals, "exitPrice"), 0);
  const quantity = safeFloat(getVal(vals, "quantity"), 1);
  const commission = safeFloat(getVal(vals, "commission"), 0);

  let pnlGross: number;
  const pnlRaw = getVal(vals, "pnl");
  if (pnlRaw && fieldToIdx["pnl"] !== undefined) {
    pnlGross = safeFloat(pnlRaw, 0);
  } else {
    pnlGross = computePnl(direction, entryPrice, exitPrice, quantity);
  }

  const pnlNet = pnlGross - commission;
  const instrument = getVal(vals, "instrument") || "UNKNOWN";
  const mae = fieldToIdx["mae"] !== undefined ? safeFloat(getVal(vals, "mae")) : undefined;
  const mfe = fieldToIdx["mfe"] !== undefined ? safeFloat(getVal(vals, "mfe")) : undefined;

  return {
    id: crypto.randomUUID(),
    strategyId,
    entryTime,
    exitTime,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    pnlGross,
    pnlNet,
    commission,
    slippage: 0,
    instrument,
    mae: mae !== undefined ? mae : undefined,
    mfe: mfe !== undefined ? mfe : undefined,
  };
}

function buildPairedTrade(
  entryVals: string[],
  exitVals: string[],
  strategyId: string,
  index: number,
  getVal: (vals: string[], field: string) => string,
  fieldToIdx: Partial<Record<string, number>>,
  warnings: string[]
): Trade | null {
  const entryTime = normalizeDateTime(getVal(entryVals, "entryTime"));
  if (!entryTime) return null;
  const exitTime = normalizeDateTime(getVal(exitVals, "entryTime")) ?? entryTime;

  const dirRaw = getVal(entryVals, "direction").toLowerCase();
  const direction: "long" | "short" = dirRaw.includes("short") || dirRaw.includes("sell") ? "short" : "long";

  // Entry price from entry row, exit price from exit row
  const entryPrice = safeFloat(getVal(entryVals, "entryPrice") || getVal(entryVals, "exitPrice"), 0);
  const exitPrice = safeFloat(getVal(exitVals, "entryPrice") || getVal(exitVals, "exitPrice"), 0);
  const quantity = safeFloat(getVal(exitVals, "quantity") || getVal(entryVals, "quantity"), 1);
  const commission = safeFloat(getVal(exitVals, "commission"), 0);

  let pnlGross: number;
  const pnlRaw = getVal(exitVals, "pnl");
  if (pnlRaw && fieldToIdx["pnl"] !== undefined) {
    pnlGross = safeFloat(pnlRaw, 0);
  } else {
    pnlGross = computePnl(direction, entryPrice, exitPrice, quantity);
  }

  const pnlNet = pnlGross - commission;
  const instrument = getVal(entryVals, "instrument") || getVal(exitVals, "instrument") || "UNKNOWN";

  return {
    id: crypto.randomUUID(),
    strategyId,
    entryTime,
    exitTime,
    direction,
    entryPrice,
    exitPrice,
    quantity,
    pnlGross,
    pnlNet,
    commission,
    slippage: 0,
    instrument,
  };
}
