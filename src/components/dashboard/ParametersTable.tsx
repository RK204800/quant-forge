import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

interface ParametersTableProps {
  parameters: Record<string, any>;
  title?: string;
}

export function ParametersTable({ parameters, title = "Strategy Parameters" }: ParametersTableProps) {
  const entries = Object.entries(parameters);
  if (entries.length === 0) return null;

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-mono">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-xs font-mono w-1/2">Parameter</TableHead>
              <TableHead className="text-xs font-mono w-1/2">Value</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map(([key, value]) => (
              <TableRow key={key}>
                <TableCell className="text-xs font-mono text-muted-foreground py-2">{key}</TableCell>
                <TableCell className="text-xs font-mono py-2">{typeof value === "object" ? JSON.stringify(value) : String(value)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
