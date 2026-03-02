import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Strategy, Trade, EquityPoint, StrategyTag } from "@/types";
import { toast } from "sonner";

const PAGE_SIZE = 5000;

async function fetchAll<T>(
  buildQuery: (from: number, to: number) => any
): Promise<T[]> {
  const allRows: T[] = [];
  let offset = 0;
  while (true) {
    const { data, error } = await buildQuery(offset, offset + PAGE_SIZE - 1);
    if (error) throw error;
    if (!data || data.length === 0) break;
    allRows.push(...data);
    if (data.length < PAGE_SIZE) break;
    offset += PAGE_SIZE;
  }
  return allRows;
}

function mapDbStrategy(row: any, trades: Trade[], equityCurve: EquityPoint[], tags: StrategyTag[] = []): Strategy {
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
    strategyClass: row.strategy_class ?? undefined,
    parameters: row.parameters ?? {},
    parameterTemplate: row.parameter_template ?? {},
    isFavorite: row.is_favorite ?? false,
    showOnDashboard: row.show_on_dashboard ?? true,
    tags,
    folderId: row.folder_id ?? null,
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

function normalizeCurveToZero(curve: EquityPoint[]): EquityPoint[] {
  if (!curve.length) return curve;
  const sorted = [...curve].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const baseline = sorted[0].equity;
  if (baseline === 0) return sorted;
  let peak = 0;
  return sorted.map((pt) => {
    const equity = +(pt.equity - baseline).toFixed(2);
    if (equity > peak) peak = equity;
    const drawdown = peak > 0 ? +((peak - equity) / peak).toFixed(4) : 0;
    return { ...pt, equity, drawdown };
  });
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

      const [tradesAll, equityAll, tagMappingsRes] = await Promise.all([
        fetchAll<any>((from, to) =>
          supabase.from("trades").select("*").in("strategy_id", strategyIds).order("entry_time").range(from, to)
        ),
        fetchAll<any>((from, to) =>
          supabase.from("equity_curves").select("*").in("strategy_id", strategyIds).order("timestamp").order("created_at").range(from, to)
        ),
        supabase.from("strategy_tag_mapping").select("strategy_id, tag_id, strategy_tags(*)").in("strategy_id", strategyIds),
      ]);

      const tradesByStrategy: Record<string, Trade[]> = {};
      tradesAll.forEach((t: any) => {
        const mapped = mapDbTrade(t);
        (tradesByStrategy[t.strategy_id] ??= []).push(mapped);
      });

      const equityByStrategy: Record<string, EquityPoint[]> = {};
      equityAll.forEach((e: any) => {
        const mapped = mapDbEquityPoint(e);
        (equityByStrategy[e.strategy_id] ??= []).push(mapped);
      });

      const tagsByStrategy: Record<string, StrategyTag[]> = {};
      if (tagMappingsRes.data) {
        tagMappingsRes.data.forEach((m: any) => {
          if (m.strategy_tags) {
            const tag: StrategyTag = {
              id: m.strategy_tags.id,
              userId: m.strategy_tags.user_id,
              name: m.strategy_tags.name,
              color: m.strategy_tags.color,
              createdAt: m.strategy_tags.created_at,
            };
            (tagsByStrategy[m.strategy_id] ??= []).push(tag);
          }
        });
      }

      return strategiesData.map((s) =>
        mapDbStrategy(s, tradesByStrategy[s.id] ?? [], normalizeCurveToZero(equityByStrategy[s.id] ?? []), tagsByStrategy[s.id] ?? [])
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

      const [stratRes, tradesAll, equityAll, tagMappingsRes] = await Promise.all([
        supabase.from("strategies").select("*").eq("id", id).single(),
        fetchAll<any>((from, to) =>
          supabase.from("trades").select("*").eq("strategy_id", id).order("entry_time").range(from, to)
        ),
        fetchAll<any>((from, to) =>
          supabase.from("equity_curves").select("*").eq("strategy_id", id).order("timestamp").order("created_at").range(from, to)
        ),
        supabase.from("strategy_tag_mapping").select("strategy_id, tag_id, strategy_tags(*)").eq("strategy_id", id),
      ]);

      if (stratRes.error) throw stratRes.error;

      const tags: StrategyTag[] = [];
      if (tagMappingsRes.data) {
        tagMappingsRes.data.forEach((m: any) => {
          if (m.strategy_tags) {
            tags.push({
              id: m.strategy_tags.id,
              userId: m.strategy_tags.user_id,
              name: m.strategy_tags.name,
              color: m.strategy_tags.color,
              createdAt: m.strategy_tags.created_at,
            });
          }
        });
      }

      return mapDbStrategy(
        stratRes.data,
        tradesAll.map(mapDbTrade),
        normalizeCurveToZero(equityAll.map(mapDbEquityPoint)),
        tags
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
  strategyClass?: string;
  parameters?: Record<string, any>;
  parameterTemplate?: Record<string, any>;
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
          strategy_class: input.strategyClass ?? null,
          parameters: input.parameters ?? {},
          parameter_template: input.parameterTemplate ?? {},
        })
        .select("id")
        .single();
      if (sErr) throw sErr;

      const strategyId = strategy.id;

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

export function useUpdateStrategy() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { id: string; name?: string; strategyClass?: string; isFavorite?: boolean; showOnDashboard?: boolean; description?: string; folderId?: string | null }) => {
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.strategyClass !== undefined) updates.strategy_class = input.strategyClass;
      if (input.isFavorite !== undefined) updates.is_favorite = input.isFavorite;
      if (input.showOnDashboard !== undefined) updates.show_on_dashboard = input.showOnDashboard;
      if (input.description !== undefined) updates.description = input.description;
      if (input.folderId !== undefined) updates.folder_id = input.folderId;

      const { error } = await supabase.from("strategies").update(updates).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
    },
    onError: (error: any) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });
}

export function useToggleFavorite() {
  const updateStrategy = useUpdateStrategy();
  return (id: string, current: boolean) => {
    updateStrategy.mutate({ id, isFavorite: !current });
  };
}

export function useToggleDashboard() {
  const updateStrategy = useUpdateStrategy();
  return (id: string, current: boolean) => {
    updateStrategy.mutate({ id, showOnDashboard: !current });
  };
}

export function useRecomputeEquity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (strategyId: string) => {
      if (!user) throw new Error("Not authenticated");

      const trades = await fetchAll<any>((from, to) =>
        supabase.from("trades").select("*").eq("strategy_id", strategyId).order("entry_time").order("exit_time").order("id").range(from, to)
      );
      if (!trades.length) throw new Error("No trades found for this strategy");

      const { error: dErr } = await supabase
        .from("equity_curves")
        .delete()
        .eq("strategy_id", strategyId);
      if (dErr) throw dErr;

      const seedTime = trades[0].entry_time;
      let runningEquity = 0;
      let peak = 0;
      const equityRows: { strategy_id: string; user_id: string; timestamp: string; equity: number; drawdown: number; benchmark_return: null }[] = [
        { strategy_id: strategyId, user_id: user.id, timestamp: seedTime, equity: 0, drawdown: 0, benchmark_return: null },
      ];

      for (const t of trades) {
        runningEquity += Number(t.pnl_net);
        if (runningEquity > peak) peak = runningEquity;
        const dd = peak > 0 ? +((peak - runningEquity) / peak).toFixed(4) : 0;
        equityRows.push({
          strategy_id: strategyId, user_id: user.id,
          timestamp: t.exit_time, equity: +runningEquity.toFixed(2), drawdown: dd, benchmark_return: null,
        });
      }

      for (let i = 0; i < equityRows.length; i += 500) {
        const batch = equityRows.slice(i, i + 500);
        const { error } = await supabase.from("equity_curves").insert(batch);
        if (error) throw error;
      }

      return strategyId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
      toast.success("Equity curve recomputed from $0");
    },
    onError: (error: any) => {
      toast.error(`Recompute failed: ${error.message}`);
    },
  });
}

// Tags hooks
export function useTags() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["strategy-tags", user?.id],
    queryFn: async (): Promise<StrategyTag[]> => {
      if (!user) return [];
      const { data, error } = await supabase.from("strategy_tags").select("*").order("name");
      if (error) throw error;
      return (data ?? []).map((t) => ({
        id: t.id,
        userId: t.user_id,
        name: t.name,
        color: t.color ?? "#666666",
        createdAt: t.created_at,
      }));
    },
    enabled: !!user,
  });
}

export function useCreateTag() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("strategy_tags").insert({ user_id: user.id, name: input.name, color: input.color });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-tags"] });
    },
  });
}

export function useDeleteTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tagId: string) => {
      const { error } = await supabase.from("strategy_tags").delete().eq("id", tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-tags"] });
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
    },
  });
}

export function useAssignTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { strategyId: string; tagId: string }) => {
      const { error } = await supabase.from("strategy_tag_mapping").insert({ strategy_id: input.strategyId, tag_id: input.tagId });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { strategyId: string; tagId: string }) => {
      const { error } = await supabase.from("strategy_tag_mapping").delete().eq("strategy_id", input.strategyId).eq("tag_id", input.tagId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
    },
  });
}

export function useArchiveStrategies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from("strategies").update({ status: "archived" }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
      toast.success("Strategies archived");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRestoreStrategies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        const { error } = await supabase.from("strategies").update({ status: "active" }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
      toast.success("Strategies restored");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteStrategies() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await supabase.from("equity_curves").delete().eq("strategy_id", id);
        await supabase.from("trades").delete().eq("strategy_id", id);
        await supabase.from("strategy_tag_mapping").delete().eq("strategy_id", id);
        const { error } = await supabase.from("strategies").delete().eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
      toast.success("Strategies permanently deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRecomputeAllEquity() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Not authenticated");

      const { data: strategiesData, error: sErr } = await supabase
        .from("strategies")
        .select("id")
        .order("created_at");
      if (sErr) throw sErr;
      if (!strategiesData?.length) return { success: 0, failed: 0 };

      let success = 0;
      let failed = 0;

      for (const s of strategiesData) {
        try {
          const trades = await fetchAll<any>((from, to) =>
            supabase.from("trades").select("*").eq("strategy_id", s.id).order("entry_time").order("exit_time").order("id").range(from, to)
          );
          if (!trades.length) { failed++; continue; }

          const { error: dErr } = await supabase.from("equity_curves").delete().eq("strategy_id", s.id);
          if (dErr) throw dErr;

          const seedTime = trades[0].entry_time;
          let runningEquity = 0;
          let peak = 0;
          const equityRows: any[] = [
            { strategy_id: s.id, user_id: user.id, timestamp: seedTime, equity: 0, drawdown: 0, benchmark_return: null },
          ];
          for (const t of trades) {
            runningEquity += Number(t.pnl_net);
            if (runningEquity > peak) peak = runningEquity;
            const dd = peak > 0 ? +((peak - runningEquity) / peak).toFixed(4) : 0;
            equityRows.push({
              strategy_id: s.id, user_id: user.id,
              timestamp: t.exit_time, equity: +runningEquity.toFixed(2), drawdown: dd, benchmark_return: null,
            });
          }
          for (let i = 0; i < equityRows.length; i += 500) {
            const batch = equityRows.slice(i, i + 500);
            const { error } = await supabase.from("equity_curves").insert(batch);
            if (error) throw error;
          }
          success++;
        } catch {
          failed++;
        }
      }

      return { success, failed };
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      queryClient.invalidateQueries({ queryKey: ["strategy"] });
      if (result) toast.success(`Recomputed ${result.success}/${result.success + result.failed} strategies`);
    },
    onError: (error: any) => {
      toast.error(`Bulk recompute failed: ${error.message}`);
    },
  });
}
