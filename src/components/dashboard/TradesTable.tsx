import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatEST } from "@/lib/timezone";
import { useState } from "react";

interface TradesTableProps {
  trades: Trade[];
}

export function TradesTable({ trades }: TradesTableProps) {
  const [sortField, setSortField] = useState<keyof Trade>("exitTime");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  const sorted = [...trades].sort((a, b) => {
    const aVal = a[sortField];
    const bVal = b[sortField];
    if (typeof aVal === "number" && typeof bVal === "number") return sortDir === "asc" ? aVal - bVal : bVal - aVal;
    return sortDir === "asc" ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
  });

  // Compute cumulative P&L in chronological order
  const chronological = [...trades].sort((a, b) => new Date(a.exitTime).getTime() - new Date(b.exitTime).getTime());
  const cumPnlMap = new Map<string, number>();
  let cumPnl = 0;
  chronological.forEach((t) => {
    cumPnl += t.pnlNet;
    cumPnlMap.set(t.id, cumPnl);
  });

  const toggleSort = (field: keyof Trade) => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortField(field); setSortDir("desc"); }
  };

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Trade Log</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto max-h-[400px] overflow-y-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead className="cursor-pointer text-xs font-mono" onClick={() => toggleSort("instrument")}>Instrument</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono" onClick={() => toggleSort("direction")}>Side</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono" onClick={() => toggleSort("entryTime")}>Entry</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono" onClick={() => toggleSort("exitTime")}>Exit</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono text-right" onClick={() => toggleSort("entryPrice")}>Entry $</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono text-right" onClick={() => toggleSort("exitPrice")}>Exit $</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono text-right" onClick={() => toggleSort("quantity")}>Qty</TableHead>
                <TableHead className="cursor-pointer text-xs font-mono text-right" onClick={() => toggleSort("pnlNet")}>P&L</TableHead>
                <TableHead className="text-xs font-mono text-right">Cum. P&L</TableHead>
                <TableHead className="text-xs font-mono text-right">Return %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice(0, 100).map((trade) => {
                const notional = trade.entryPrice * trade.quantity;
                const returnPct = notional > 0 ? (trade.pnlNet / notional) * 100 : 0;
                const tradeCumPnl = cumPnlMap.get(trade.id) || 0;

                return (
                  <TableRow key={trade.id} className="text-xs font-mono">
                    <TableCell className="py-2">{trade.instrument}</TableCell>
                    <TableCell className="py-2">
                      <Badge variant={trade.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                        {trade.direction.toUpperCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="py-2">{formatEST(trade.entryTime, "MM/dd HH:mm")}</TableCell>
                    <TableCell className="py-2">{formatEST(trade.exitTime, "MM/dd HH:mm")}</TableCell>
                    <TableCell className="py-2 text-right">{isFinite(trade.entryPrice) ? trade.entryPrice.toFixed(2) : "N/A"}</TableCell>
                    <TableCell className="py-2 text-right">{isFinite(trade.exitPrice) ? trade.exitPrice.toFixed(2) : "N/A"}</TableCell>
                    <TableCell className="py-2 text-right">{isFinite(trade.quantity) ? trade.quantity : "N/A"}</TableCell>
                    <TableCell className={`py-2 text-right font-medium ${trade.pnlNet >= 0 ? "text-profit" : "text-loss"}`}>
                      {isFinite(trade.pnlNet) ? `${trade.pnlNet >= 0 ? "+" : ""}${trade.pnlNet.toFixed(2)}` : "N/A"}
                    </TableCell>
                    <TableCell className={`py-2 text-right ${tradeCumPnl >= 0 ? "text-profit" : "text-loss"}`}>
                      ${tradeCumPnl.toFixed(2)}
                    </TableCell>
                    <TableCell className={`py-2 text-right ${returnPct >= 0 ? "text-profit" : "text-loss"}`}>
                      {returnPct.toFixed(2)}%
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
