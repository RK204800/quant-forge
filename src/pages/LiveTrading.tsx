import { Card, CardContent } from "@/components/ui/card";
import { Zap } from "lucide-react";

const LiveTrading = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold font-mono tracking-tight">Live Trading</h1>
      <p className="text-sm text-muted-foreground">Connect broker APIs and track live execution</p>
    </div>
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <Zap className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-mono">Broker integration coming in Phase 3</p>
        <p className="text-xs text-muted-foreground">Alpaca & Interactive Brokers support planned</p>
      </CardContent>
    </Card>
  </div>
);

export default LiveTrading;
