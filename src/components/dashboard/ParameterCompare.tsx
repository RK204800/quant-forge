import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Strategy } from "@/types";

interface ParameterCompareProps {
  strategies: Strategy[];
}

export function ParameterCompare({ strategies }: ParameterCompareProps) {
  if (strategies.length < 2) return null;

  // Collect all unique parameter keys
  const allKeys = new Set<string>();
  strategies.forEach((s) => {
    if (s.parameters) Object.keys(s.parameters).forEach((k) => allKeys.add(k));
  });

  if (allKeys.size === 0) return null;

  const keys = Array.from(allKeys).sort();

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">Parameter Comparison</CardTitle>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-mono">Parameter</TableHead>
              {strategies.map((s) => (
                <TableHead key={s.id} className="text-xs font-mono">{s.name}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((key) => {
              const values = strategies.map((s) => s.parameters?.[key]);
              const allSame = values.every((v) => JSON.stringify(v) === JSON.stringify(values[0]));
              return (
                <TableRow key={key}>
                  <TableCell className="text-xs font-mono text-muted-foreground py-2">{key}</TableCell>
                  {values.map((v, i) => (
                    <TableCell key={i} className={`text-xs font-mono py-2 ${!allSame ? "text-primary font-semibold" : ""}`}>
                      {v !== undefined ? (typeof v === "object" ? JSON.stringify(v) : String(v)) : "—"}
                    </TableCell>
                  ))}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
