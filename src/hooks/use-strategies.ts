import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Strategy, Trade, EquityPoint } from "@/types";
import { toast } from "sonner";

function mapDbStrategy(row: any, trades: Trade[], equityCurve: EquityPoint[]): Strategy {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    description: row.description ?? "",
    assetClass: row.asset_class ?? "",
    timeframe: row.timeframe ?? "",
    broker: row.broker ?? "",
    backtestEngine: row.backtest_engine ?? "",
    status: row.status as Strategy["status"],
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    trades,
    equityCurve,
  };
}

function mapDbTrade(row: any): Trade {
  return {
    id: row.id,
    strategyId: row.strategy_id,
    externalId: row.external_id ?? undefined,
    entryTime: row.entry_time,
    exitTime: row.exit_time,
    direction: row.direction as "long" | "short",
    entryPrice: Number(row.entry_price),
    exitPrice: Number(row.exit_price),
    quantity: Number(row.quantity),
    pnlGross: Number(row.pnl_gross),
    pnlNet: Number(row.pnl_net),
    commission: Number(row.commission),
    slippage: Number(row.slippage),
    instrument: row.instrument,
    notes: row.notes ?? undefined,
  };
}

function mapDbEquityPoint(row: any): EquityPoint {
  return {
    timestamp: row.timestamp,
    equity: Number(row.equity),
    drawdown: Number(row.drawdown),
    benchmarkReturn: row.benchmark_return != null ? Number(row.benchmark_return) : undefined,
  };
}

export function useStrategies() {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["strategies", user?.id],
    queryFn: async (): Promise<Strategy[]> => {
      if (!user) return [];

      const { data: strategiesData, error: sErr } = await supabase
        .from("strategies")
        .select("*")
        .order("created_at", { ascending: false });
      if (sErr) throw sErr;
      if (!strategiesData?.length) return [];

      const strategyIds = strategiesData.map((s) => s.id);

      const [tradesRes, equityRes] = await Promise.all([
        supabase.from("trades").select("*").in("strategy_id", strategyIds).order("entry_time"),
        supabase.from("equity_curves").select("*").in("strategy_id", strategyIds).order("timestamp"),
      ]);

      if (tradesRes.error) throw tradesRes.error;
      if (equityRes.error) throw equityRes.error;

      const tradesByStrategy: Record<string, Trade[]> = {};
      (tradesRes.data ?? []).forEach((t) => {
        const mapped = mapDbTrade(t);
        (tradesByStrategy[t.strategy_id] ??= []).push(mapped);
      });

      const equityByStrategy: Record<string, EquityPoint[]> = {};
      (equityRes.data ?? []).forEach((e) => {
        const mapped = mapDbEquityPoint(e);
        (equityByStrategy[e.strategy_id] ??= []).push(mapped);
      });

      return strategiesData.map((s) =>
        mapDbStrategy(s, tradesByStrategy[s.id] ?? [], equityByStrategy[s.id] ?? [])
      );
    },
    enabled: !!user,
  });
}

export function useStrategy(id: string | undefined) {
  const { user } = useAuth();

  return useQuery({
    queryKey: ["strategy", id, user?.id],
    queryFn: async (): Promise<Strategy | null> => {
      if (!user || !id) return null;

      const [stratRes, tradesRes, equityRes] = await Promise.all([
        supabase.from("strategies").select("*").eq("id", id).single(),
        supabase.from("trades").select("*").eq("strategy_id", id).order("entry_time"),
        supabase.from("equity_curves").select("*").eq("strategy_id", id).order("timestamp"),
      ]);

      if (stratRes.error) throw stratRes.error;
      if (tradesRes.error) throw tradesRes.error;
      if (equityRes.error) throw equityRes.error;

      return mapDbStrategy(
        stratRes.data,
        (tradesRes.data ?? []).map(mapDbTrade),
        (equityRes.data ?? []).map(mapDbEquityPoint)
      );
    },
    enabled: !!user && !!id,
  });
}

interface SaveStrategyInput {
  name: string;
  description?: string;
  assetClass?: string;
  timeframe?: string;
  broker?: string;
  backtestEngine?: string;
  trades: Trade[];
  equityCurve: EquityPoint[];
  format: string;
}

export function useSaveStrategy() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SaveStrategyInput) => {
      if (!user) throw new Error("Not authenticated");

      // 1. Insert strategy
      const { data: strategy, error: sErr } = await supabase
        .from("strategies")
        .insert({
          user_id: user.id,
          name: input.name,
          description: input.description ?? "",
          asset_class: input.assetClass ?? "",
          timeframe: input.timeframe ?? "",
          broker: input.broker ?? "",
          backtest_engine: input.backtestEngine ?? input.format,
          status: "active",
        })
        .select("id")
        .single();
      if (sErr) throw sErr;

      const strategyId = strategy.id;

      // 2. Insert trades in batches of 500
      const tradeRows = input.trades.map((t) => ({
        strategy_id: strategyId,
        user_id: user.id,
        external_id: t.externalId ?? null,
        entry_time: t.entryTime,
        exit_time: t.exitTime,
        direction: t.direction,
        entry_price: t.entryPrice,
        exit_price: t.exitPrice,
        quantity: t.quantity,
        pnl_gross: t.pnlGross,
        pnl_net: t.pnlNet,
        commission: t.commission,
        slippage: t.slippage,
        instrument: t.instrument,
        notes: t.notes ?? null,
      }));

      for (let i = 0; i < tradeRows.length; i += 500) {
        const batch = tradeRows.slice(i, i + 500);
        const { error } = await supabase.from("trades").insert(batch);
        if (error) throw error;
      }

      // 3. Insert equity curve in batches of 500
      const equityRows = input.equityCurve.map((e) => ({
        strategy_id: strategyId,
        user_id: user.id,
        timestamp: e.timestamp,
        equity: e.equity,
        drawdown: e.drawdown,
        benchmark_return: e.benchmarkReturn ?? null,
      }));

      for (let i = 0; i < equityRows.length; i += 500) {
        const batch = equityRows.slice(i, i + 500);
        const { error } = await supabase.from("equity_curves").insert(batch);
        if (error) throw error;
      }

      return strategyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Strategy saved successfully");
    },
    onError: (error: any) => {
      toast.error(`Failed to save: ${error.message}`);
    },
  });
}
