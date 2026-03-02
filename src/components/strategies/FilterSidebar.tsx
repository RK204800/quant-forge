import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { StrategyTag } from "@/types";
import { ChevronDown, ChevronRight, Star, TrendingUp, Clock } from "lucide-react";
import { FolderTree } from "@/components/strategies/FolderTree";

interface FilterState {
  classes: string[];
  timeframes: string[];
  engines: string[];
  assetClasses: string[];
  statuses: string[];
  tagIds: string[];
  favoritesOnly: boolean;
  quickFilter: "none" | "best" | "favorites" | "recent";
}

interface FilterSidebarProps {
  filters: FilterState;
  onFiltersChange: (f: FilterState) => void;
  availableClasses: string[];
  availableTimeframes: string[];
  availableEngines: string[];
  availableAssetClasses: string[];
  tags: StrategyTag[];
  selectedFolderId: string | null;
  onFolderSelect: (folderId: string | null) => void;
  folderCounts: Record<string, number>;
  onArchiveDrop?: (strategyIds: string[]) => void;
}

function FilterSection({ title, children, defaultOpen = false }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border pb-3">
      <button onClick={() => setOpen(!open)} className="flex items-center justify-between w-full text-xs font-mono uppercase tracking-wider text-muted-foreground hover:text-foreground py-1">
        {title}
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
      </button>
      {open && <div className="mt-2 space-y-1.5">{children}</div>}
    </div>
  );
}

function CheckboxItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: (c: boolean) => void }) {
  return (
    <label className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground">
      <Checkbox checked={checked} onCheckedChange={onChange} className="h-3.5 w-3.5" />
      <span className="truncate">{label}</span>
    </label>
  );
}

export function FilterSidebar({ filters, onFiltersChange, availableClasses, availableTimeframes, availableEngines, availableAssetClasses, tags, selectedFolderId, onFolderSelect, folderCounts, onArchiveDrop }: FilterSidebarProps) {
  const toggle = (key: keyof Pick<FilterState, "classes" | "timeframes" | "engines" | "assetClasses" | "statuses" | "tagIds">, val: string) => {
    const arr = filters[key];
    const next = arr.includes(val) ? arr.filter((v) => v !== val) : [...arr, val];
    onFiltersChange({ ...filters, [key]: next });
  };

  const setQuick = (q: FilterState["quickFilter"]) => {
    onFiltersChange({ ...filters, quickFilter: filters.quickFilter === q ? "none" : q, favoritesOnly: q === "favorites" ? !filters.favoritesOnly : false });
  };

  return (
    <div className="w-52 shrink-0 space-y-3">
      {/* Folder tree */}
      <FolderTree
        selectedFolderId={selectedFolderId}
        onFolderSelect={onFolderSelect}
        strategyCounts={folderCounts}
        onArchiveDrop={onArchiveDrop}
      />

      <div className="border-b border-border" />

      <p className="text-xs font-mono font-semibold uppercase tracking-wider text-foreground">Filters</p>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-1.5">
        <Button variant={filters.quickFilter === "best" ? "default" : "outline"} size="sm" className="h-7 text-[10px] gap-1" onClick={() => setQuick("best")}>
          <TrendingUp className="h-3 w-3" /> Best
        </Button>
        <Button variant={filters.quickFilter === "favorites" ? "default" : "outline"} size="sm" className="h-7 text-[10px] gap-1" onClick={() => setQuick("favorites")}>
          <Star className="h-3 w-3" /> Favorites
        </Button>
        <Button variant={filters.quickFilter === "recent" ? "default" : "outline"} size="sm" className="h-7 text-[10px] gap-1" onClick={() => setQuick("recent")}>
          <Clock className="h-3 w-3" /> Recent
        </Button>
      </div>

      {availableClasses.length > 0 && (
        <FilterSection title="Strategy Class" defaultOpen>
          {availableClasses.map((c) => (
            <CheckboxItem key={c} label={c} checked={filters.classes.includes(c)} onChange={() => toggle("classes", c)} />
          ))}
        </FilterSection>
      )}

      {availableTimeframes.length > 0 && (
        <FilterSection title="Timeframe">
          {availableTimeframes.map((t) => (
            <CheckboxItem key={t} label={t} checked={filters.timeframes.includes(t)} onChange={() => toggle("timeframes", t)} />
          ))}
        </FilterSection>
      )}

      {availableEngines.length > 0 && (
        <FilterSection title="Engine">
          {availableEngines.map((e) => (
            <CheckboxItem key={e} label={e} checked={filters.engines.includes(e)} onChange={() => toggle("engines", e)} />
          ))}
        </FilterSection>
      )}

      {availableAssetClasses.length > 0 && (
        <FilterSection title="Asset Class">
          {availableAssetClasses.map((a) => (
            <CheckboxItem key={a} label={a} checked={filters.assetClasses.includes(a)} onChange={() => toggle("assetClasses", a)} />
          ))}
        </FilterSection>
      )}

      <FilterSection title="Status">
        {["active", "paused", "archived"].map((s) => (
          <CheckboxItem key={s} label={s} checked={filters.statuses.includes(s)} onChange={() => toggle("statuses", s)} />
        ))}
      </FilterSection>

      {tags.length > 0 && (
        <FilterSection title="Tags">
          {tags.map((t) => (
            <label key={t.id} className="flex items-center gap-2 text-xs cursor-pointer hover:text-foreground text-muted-foreground">
              <Checkbox checked={filters.tagIds.includes(t.id)} onCheckedChange={() => toggle("tagIds", t.id)} className="h-3.5 w-3.5" />
              <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.color }} />
              <span className="truncate">{t.name}</span>
            </label>
          ))}
        </FilterSection>
      )}

      {(filters.classes.length > 0 || filters.timeframes.length > 0 || filters.engines.length > 0 || filters.assetClasses.length > 0 || filters.statuses.length > 0 || filters.tagIds.length > 0 || filters.quickFilter !== "none") && (
        <Button variant="ghost" size="sm" className="text-[10px] w-full" onClick={() => onFiltersChange({ classes: [], timeframes: [], engines: [], assetClasses: [], statuses: [], tagIds: [], favoritesOnly: false, quickFilter: "none" })}>
          Clear all filters
        </Button>
      )}
    </div>
  );
}

export type { FilterState };
