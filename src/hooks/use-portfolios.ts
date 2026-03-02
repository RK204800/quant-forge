import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface PortfolioRow {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  strategyCount: number;
}

export interface PortfolioStrategy {
  id: string;
  strategyId: string;
  weight: number;
}

export function usePortfolios() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolios", user?.id],
    queryFn: async (): Promise<PortfolioRow[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("portfolios")
        .select("*, portfolio_strategies(id)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        description: p.description ?? "",
        createdAt: p.created_at,
        updatedAt: p.updated_at,
        strategyCount: p.portfolio_strategies?.length ?? 0,
      }));
    },
    enabled: !!user,
  });
}

export function usePortfolio(id: string | undefined) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["portfolio", id, user?.id],
    queryFn: async () => {
      if (!user || !id) return null;
      const [pRes, psRes] = await Promise.all([
        supabase.from("portfolios").select("*").eq("id", id).single(),
        supabase.from("portfolio_strategies").select("*").eq("portfolio_id", id),
      ]);
      if (pRes.error) throw pRes.error;
      return {
        id: pRes.data.id,
        name: pRes.data.name,
        description: pRes.data.description ?? "",
        createdAt: pRes.data.created_at,
        updatedAt: pRes.data.updated_at,
        strategies: (psRes.data ?? []).map((ps: any) => ({
          id: ps.id,
          strategyId: ps.strategy_id,
          weight: Number(ps.weight),
        })) as PortfolioStrategy[],
      };
    },
    enabled: !!user && !!id,
  });
}

export function useCreatePortfolio() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; description?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { data, error } = await supabase
        .from("portfolios")
        .insert({ user_id: user.id, name: input.name, description: input.description ?? "" })
        .select("id")
        .single();
      if (error) throw error;
      return data.id as string;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdatePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; description?: string }) => {
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.description !== undefined) updates.description = input.description;
      const { error } = await supabase.from("portfolios").update(updates).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeletePortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("portfolios").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
      toast.success("Portfolio deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useAddToPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { portfolioId: string; strategyIds: string[] }) => {
      const rows = input.strategyIds.map((sid) => ({
        portfolio_id: input.portfolioId,
        strategy_id: sid,
        weight: Math.round(100 / input.strategyIds.length),
      }));
      const { error } = await supabase.from("portfolio_strategies").upsert(rows, { onConflict: "portfolio_id,strategy_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useRemoveFromPortfolio() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { portfolioId: string; strategyId: string }) => {
      const { error } = await supabase
        .from("portfolio_strategies")
        .delete()
        .eq("portfolio_id", input.portfolioId)
        .eq("strategy_id", input.strategyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
      queryClient.invalidateQueries({ queryKey: ["portfolios"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateWeight() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { portfolioId: string; strategyId: string; weight: number }) => {
      const { error } = await supabase
        .from("portfolio_strategies")
        .update({ weight: input.weight })
        .eq("portfolio_id", input.portfolioId)
        .eq("strategy_id", input.strategyId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["portfolio"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}
