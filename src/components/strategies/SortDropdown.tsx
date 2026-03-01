import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type SortField = "profitFactor" | "totalReturn" | "sharpe" | "sortino" | "winRate" | "maxDrawdown" | "dateAdded";

const sortOptions: { value: SortField; label: string }[] = [
  { value: "profitFactor", label: "Profit Factor" },
  { value: "totalReturn", label: "Total Return" },
  { value: "sharpe", label: "Sharpe Ratio" },
  { value: "sortino", label: "Sortino Ratio" },
  { value: "winRate", label: "Win Rate" },
  { value: "maxDrawdown", label: "Max Drawdown" },
  { value: "dateAdded", label: "Date Added" },
];

export function SortDropdown({ value, onChange }: { value: SortField; onChange: (v: SortField) => void }) {
  return (
    <Select value={value} onValueChange={(v) => onChange(v as SortField)}>
      <SelectTrigger className="w-44 h-8 text-xs font-mono">
        <SelectValue placeholder="Sort by..." />
      </SelectTrigger>
      <SelectContent>
        {sortOptions.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs font-mono">{o.label}</SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
