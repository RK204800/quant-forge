import { useState, DragEvent } from "react";
import { useFolders, useCreateFolder, useUpdateFolder, useDeleteFolder, useMoveToFolder, StrategyFolder } from "@/hooks/use-folders";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { FolderOpen, FolderPlus, MoreHorizontal, Pencil, Trash2, Check, X, Archive } from "lucide-react";

interface FolderTreeProps {
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  strategyCounts: Record<string, number>;
  onArchiveDrop?: (strategyIds: string[]) => void;
}

const FOLDER_COLORS = ["#666666", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"];

export function FolderTree({ selectedFolderId, onFolderSelect, strategyCounts, onArchiveDrop }: FolderTreeProps) {
  const { data: folders = [] } = useFolders();
  const createFolder = useCreateFolder();
  const updateFolder = useUpdateFolder();
  const deleteFolder = useDeleteFolder();
  const moveToFolder = useMoveToFolder();

  const [isCreating, setIsCreating] = useState(false);
  const [newName, setNewName] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [dragOverId, setDragOverId] = useState<string | null>(null);

  const handleCreate = () => {
    if (!newName.trim()) return;
    createFolder.mutate({ name: newName.trim() });
    setNewName("");
    setIsCreating(false);
  };

  const handleRename = (id: string) => {
    if (!editName.trim()) return;
    updateFolder.mutate({ id, name: editName.trim() });
    setEditingId(null);
  };

  const handleDrop = (e: DragEvent, folderId: string | null, archive?: boolean) => {
    e.preventDefault();
    setDragOverId(null);
    try {
      const data = JSON.parse(e.dataTransfer.getData("application/strategy-ids"));
      if (Array.isArray(data) && data.length > 0) {
        if (archive) {
          onArchiveDrop?.(data);
        } else {
          moveToFolder.mutate({ strategyIds: data, folderId });
        }
      }
    } catch {}
  };

  const handleDragOver = (e: DragEvent, id: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverId(id);
  };

  const handleDragLeave = () => setDragOverId(null);

  const rootFolders = folders.filter((f) => !f.parentId);

  const isSelected = (id: string | null) => selectedFolderId === id;

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between mb-1">
        <p className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">Folders</p>
        <Button variant="ghost" size="icon" className="h-5 w-5" onClick={() => setIsCreating(true)}>
          <FolderPlus className="h-3 w-3" />
        </Button>
      </div>

      {/* All Strategies */}
      <button
        onClick={() => onFolderSelect(null)}
        className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors ${isSelected(null) ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate flex-1 text-left">All Strategies</span>
        <span className="text-[10px] opacity-70">{strategyCounts.all ?? 0}</span>
      </button>

      {/* Uncategorized */}
      <button
        onClick={() => onFolderSelect("uncategorized")}
        onDrop={(e) => handleDrop(e, null)}
        onDragOver={(e) => handleDragOver(e, "uncategorized")}
        onDragLeave={handleDragLeave}
        className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors ${dragOverId === "uncategorized" ? "bg-primary/20 ring-2 ring-primary/50" : ""} ${isSelected("uncategorized") ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
      >
        <FolderOpen className="h-3.5 w-3.5 shrink-0 opacity-50" />
        <span className="truncate flex-1 text-left">Uncategorized</span>
        <span className="text-[10px] opacity-70">{strategyCounts.uncategorized ?? 0}</span>
      </button>

      {/* User folders */}
      {rootFolders.map((folder) => (
        <FolderItem
          key={folder.id}
          folder={folder}
          isSelected={isSelected(folder.id)}
          onSelect={() => onFolderSelect(folder.id)}
          count={strategyCounts[folder.id] ?? 0}
          editingId={editingId}
          editName={editName}
          onStartEdit={(f) => { setEditingId(f.id); setEditName(f.name); }}
          onRename={handleRename}
          onCancelEdit={() => setEditingId(null)}
          onEditNameChange={setEditName}
          onDelete={(id) => {
            deleteFolder.mutate(id);
            if (selectedFolderId === id) onFolderSelect(null);
          }}
          onColorChange={(id, color) => updateFolder.mutate({ id, color })}
          isDragOver={dragOverId === folder.id}
          onDrop={(e) => handleDrop(e, folder.id)}
          onDragOver={(e) => handleDragOver(e, folder.id)}
          onDragLeave={handleDragLeave}
        />
      ))}

      {/* Archived virtual folder */}
      <button
        onClick={() => onFolderSelect("archived")}
        onDrop={(e) => handleDrop(e, null, true)}
        onDragOver={(e) => handleDragOver(e, "archived")}
        onDragLeave={handleDragLeave}
        className={`w-full flex items-center gap-2 text-xs px-2 py-1.5 rounded-md transition-colors mt-2 ${dragOverId === "archived" ? "bg-primary/20 ring-2 ring-primary/50" : ""} ${isSelected("archived") ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
      >
        <Archive className="h-3.5 w-3.5 shrink-0 opacity-60" />
        <span className="truncate flex-1 text-left">Archived</span>
        <span className="text-[10px] opacity-70">{strategyCounts.archived ?? 0}</span>
      </button>

      {/* Inline create */}
      {isCreating && (
        <div className="flex items-center gap-1 px-1">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Folder name"
            className="h-6 text-xs flex-1"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === "Enter") handleCreate();
              if (e.key === "Escape") setIsCreating(false);
            }}
          />
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={handleCreate}><Check className="h-3 w-3" /></Button>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => setIsCreating(false)}><X className="h-3 w-3" /></Button>
        </div>
      )}
    </div>
  );
}

function FolderItem({
  folder, isSelected, onSelect, count, editingId, editName, onStartEdit, onRename, onCancelEdit, onEditNameChange, onDelete, onColorChange,
  isDragOver, onDrop, onDragOver, onDragLeave,
}: {
  folder: StrategyFolder;
  isSelected: boolean;
  onSelect: () => void;
  count: number;
  editingId: string | null;
  editName: string;
  onStartEdit: (f: StrategyFolder) => void;
  onRename: (id: string) => void;
  onCancelEdit: () => void;
  onEditNameChange: (v: string) => void;
  onDelete: (id: string) => void;
  onColorChange: (id: string, color: string) => void;
  isDragOver: boolean;
  onDrop: (e: DragEvent<HTMLDivElement>) => void;
  onDragOver: (e: DragEvent<HTMLDivElement>) => void;
  onDragLeave: () => void;
}) {
  if (editingId === folder.id) {
    return (
      <div className="flex items-center gap-1 px-1">
        <Input
          value={editName}
          onChange={(e) => onEditNameChange(e.target.value)}
          className="h-6 text-xs flex-1"
          autoFocus
          onKeyDown={(e) => {
            if (e.key === "Enter") onRename(folder.id);
            if (e.key === "Escape") onCancelEdit();
          }}
        />
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={() => onRename(folder.id)}><Check className="h-3 w-3" /></Button>
        <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0" onClick={onCancelEdit}><X className="h-3 w-3" /></Button>
      </div>
    );
  }

  return (
    <div
      onDrop={onDrop}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      className={`group flex items-center gap-1 text-xs px-2 py-1.5 rounded-md transition-colors ${isDragOver ? "bg-primary/20 ring-2 ring-primary/50" : ""} ${isSelected ? "bg-accent text-accent-foreground font-medium" : "text-muted-foreground hover:text-foreground hover:bg-accent/50"}`}
    >
      <button onClick={onSelect} className="flex items-center gap-2 flex-1 min-w-0 text-left">
        <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: folder.color }} />
        <span className="truncate">{folder.name}</span>
      </button>
      <span className="text-[10px] opacity-70 shrink-0">{count}</span>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-5 w-5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            <MoreHorizontal className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-36">
          <DropdownMenuItem onClick={() => onStartEdit(folder)}>
            <Pencil className="h-3 w-3 mr-2" /> Rename
          </DropdownMenuItem>
          <DropdownMenuItem className="flex-col items-start gap-1.5">
            <span className="text-xs">Color</span>
            <div className="flex gap-1">
              {["#666666", "#ef4444", "#f97316", "#eab308", "#22c55e", "#3b82f6", "#8b5cf6", "#ec4899"].map((c) => (
                <button
                  key={c}
                  className={`h-4 w-4 rounded-full border ${folder.color === c ? "ring-2 ring-primary ring-offset-1" : "border-transparent"}`}
                  style={{ backgroundColor: c }}
                  onClick={(e) => { e.stopPropagation(); onColorChange(folder.id, c); }}
                />
              ))}
            </div>
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onDelete(folder.id)} className="text-destructive">
            <Trash2 className="h-3 w-3 mr-2" /> Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
