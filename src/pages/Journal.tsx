import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BookOpen } from "lucide-react";

const Journal = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold font-mono tracking-tight">Strategy Journal</h1>
      <p className="text-sm text-muted-foreground">Log pre-trade setups, post-trade reviews, and notes</p>
    </div>
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <BookOpen className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-mono">Journal entries will appear here once connected to backend</p>
        <p className="text-xs text-muted-foreground">Phase 2 feature — coming soon</p>
      </CardContent>
    </Card>
  </div>
);

export default Journal;
