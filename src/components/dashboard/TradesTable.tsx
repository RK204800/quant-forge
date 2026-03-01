import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trade } from "@/types";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
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
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.slice(0, 50).map((trade) => (
                <TableRow key={trade.id} className="text-xs font-mono">
                  <TableCell className="py-2">{trade.instrument}</TableCell>
                  <TableCell className="py-2">
                    <Badge variant={trade.direction === "long" ? "default" : "destructive"} className="text-[10px] px-1.5 py-0">
                      {trade.direction.toUpperCase()}
                    </Badge>
                  </TableCell>
                  <TableCell className="py-2">{format(new Date(trade.entryTime), "MM/dd HH:mm")}</TableCell>
                  <TableCell className="py-2">{format(new Date(trade.exitTime), "MM/dd HH:mm")}</TableCell>
                  <TableCell className="py-2 text-right">{trade.entryPrice.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right">{trade.exitPrice.toFixed(2)}</TableCell>
                  <TableCell className="py-2 text-right">{trade.quantity}</TableCell>
                  <TableCell className={`py-2 text-right font-medium ${trade.pnlNet >= 0 ? "text-profit" : "text-loss"}`}>
                    {trade.pnlNet >= 0 ? "+" : ""}{trade.pnlNet.toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
