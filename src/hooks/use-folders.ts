import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StrategyFolder {
  id: string;
  userId: string;
  name: string;
  color: string;
  parentId: string | null;
  sortOrder: number;
  createdAt: string;
}

function mapRow(row: any): StrategyFolder {
  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    color: row.color ?? "#666666",
    parentId: row.parent_id ?? null,
    sortOrder: row.sort_order ?? 0,
    createdAt: row.created_at,
  };
}

export function useFolders() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["strategy-folders", user?.id],
    queryFn: async (): Promise<StrategyFolder[]> => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("strategy_folders")
        .select("*")
        .order("sort_order")
        .order("name");
      if (error) throw error;
      return (data ?? []).map(mapRow);
    },
    enabled: !!user,
  });
}

export function useCreateFolder() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { name: string; color?: string; parentId?: string }) => {
      if (!user) throw new Error("Not authenticated");
      const { error } = await supabase.from("strategy_folders").insert({
        user_id: user.id,
        name: input.name,
        color: input.color ?? "#666666",
        parent_id: input.parentId ?? null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-folders"] });
      toast.success("Folder created");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useUpdateFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { id: string; name?: string; color?: string }) => {
      const updates: Record<string, any> = {};
      if (input.name !== undefined) updates.name = input.name;
      if (input.color !== undefined) updates.color = input.color;
      const { error } = await supabase.from("strategy_folders").update(updates).eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-folders"] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useDeleteFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (folderId: string) => {
      // Move strategies in this folder to uncategorized first
      await supabase.from("strategies").update({ folder_id: null }).eq("folder_id", folderId);
      const { error } = await supabase.from("strategy_folders").delete().eq("id", folderId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategy-folders"] });
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Folder deleted");
    },
    onError: (e: any) => toast.error(e.message),
  });
}

export function useMoveToFolder() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: { strategyIds: string[]; folderId: string | null }) => {
      for (const id of input.strategyIds) {
        const { error } = await supabase.from("strategies").update({ folder_id: input.folderId }).eq("id", id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["strategies"] });
      toast.success("Strategies moved");
    },
    onError: (e: any) => toast.error(e.message),
  });
}
