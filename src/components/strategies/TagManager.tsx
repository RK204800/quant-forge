import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useCreateTag, useDeleteTag, useTags, useAssignTag, useRemoveTag } from "@/hooks/use-strategies";
import { StrategyTag } from "@/types";
import { Tags, Plus, X } from "lucide-react";

const TAG_COLORS = ["#ef4444", "#f97316", "#eab308", "#22c55e", "#06b6d4", "#3b82f6", "#8b5cf6", "#ec4899", "#666666"];

export function TagManagerDialog({ open, onOpenChange }: { open?: boolean; onOpenChange?: (open: boolean) => void } = {}) {
  const { data: tags = [] } = useTags();
  const createTag = useCreateTag();
  const deleteTag = useDeleteTag();
  const [name, setName] = useState("");
  const [color, setColor] = useState(TAG_COLORS[0]);

  const handleCreate = () => {
    if (!name.trim()) return;
    createTag.mutate({ name: name.trim(), color });
    setName("");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {open === undefined && (
        <DialogTrigger asChild>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Tags className="h-3 w-3" /> Tags
          </Button>
        </DialogTrigger>
      )}
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="font-mono text-sm">Manage Tags</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="New tag name" className="h-8 text-xs font-mono" onKeyDown={(e) => e.key === "Enter" && handleCreate()} />
            <Button size="sm" className="h-8 shrink-0" onClick={handleCreate} disabled={!name.trim()}>
              <Plus className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex gap-1.5 flex-wrap">
            {TAG_COLORS.map((c) => (
              <button key={c} onClick={() => setColor(c)} className={`w-5 h-5 rounded-full border-2 transition-all ${color === c ? "border-foreground scale-110" : "border-transparent"}`} style={{ backgroundColor: c }} />
            ))}
          </div>
          <div className="space-y-1.5 max-h-48 overflow-y-auto">
            {tags.map((t) => (
              <div key={t.id} className="flex items-center justify-between text-xs px-2 py-1.5 rounded bg-muted/50">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                  <span className="font-mono">{t.name}</span>
                </div>
                <button onClick={() => deleteTag.mutate(t.id)} className="text-muted-foreground hover:text-loss">
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
            {tags.length === 0 && <p className="text-xs text-muted-foreground text-center py-4">No tags yet</p>}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function TagAssigner({ strategyId, currentTags }: { strategyId: string; currentTags: StrategyTag[] }) {
  const { data: allTags = [] } = useTags();
  const assignTag = useAssignTag();
  const removeTag = useRemoveTag();

  const currentIds = currentTags.map((t) => t.id);
  const unassigned = allTags.filter((t) => !currentIds.includes(t.id));

  return (
    <div className="flex flex-wrap gap-1 items-center">
      {currentTags.map((t) => (
        <button
          key={t.id}
          onClick={(e) => { e.preventDefault(); e.stopPropagation(); removeTag.mutate({ strategyId, tagId: t.id }); }}
          className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-mono hover:opacity-75 transition-opacity"
          style={{ backgroundColor: t.color + "22", color: t.color, border: `1px solid ${t.color}44` }}
        >
          {t.name} <X className="h-2.5 w-2.5" />
        </button>
      ))}
      {unassigned.length > 0 && (
        <select
          className="h-5 text-[10px] bg-transparent border border-border rounded px-1 text-muted-foreground cursor-pointer"
          value=""
          onChange={(e) => { e.stopPropagation(); if (e.target.value) assignTag.mutate({ strategyId, tagId: e.target.value }); }}
          onClick={(e) => e.stopPropagation()}
        >
          <option value="">+ tag</option>
          {unassigned.map((t) => (
            <option key={t.id} value={t.id}>{t.name}</option>
          ))}
        </select>
      )}
    </div>
  );
}
