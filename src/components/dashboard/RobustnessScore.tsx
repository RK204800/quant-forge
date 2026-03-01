import { useMemo } from "react";
import { Trade, EquityPoint } from "@/types";
import { walkForwardAnalysis } from "@/lib/robustness";
import { calculateStabilityScore } from "@/lib/robustness";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RobustnessScoreProps {
  trades: Trade[];
  equityCurve: EquityPoint[];
}

function ScoreRing({ score, label, size = 80 }: { score: number; label: string; size?: number }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? "hsl(142 70% 45%)" : score >= 40 ? "hsl(38 92% 50%)" : "hsl(0 72% 51%)";

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} className="transform -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="hsl(220 13% 18%)" strokeWidth={4} />
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={color} strokeWidth={4} strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" />
      </svg>
      <div className="text-center -mt-[calc(50%+10px)]">
        <span className="text-lg font-mono font-bold" style={{ color }}>{score}</span>
      </div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-4">{label}</p>
    </div>
  );
}

export function RobustnessScore({ trades, equityCurve }: RobustnessScoreProps) {
  const stability = useMemo(() => {
    const segments = walkForwardAnalysis(trades, equityCurve);
    return calculateStabilityScore(segments);
  }, [trades, equityCurve]);

  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Stability Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex items-center justify-center gap-8 py-4">
          <ScoreRing score={stability.overall} label="Overall" size={100} />
        </div>
        <div className="grid grid-cols-4 gap-4 mt-4">
          <ScoreRing score={stability.sharpeConsistency} label="Sharpe" size={64} />
          <ScoreRing score={stability.drawdownRecovery} label="Recovery" size={64} />
          <ScoreRing score={stability.winRateStability} label="Win Rate" size={64} />
          <ScoreRing score={stability.profitFactorStability} label="PF" size={64} />
        </div>
      </CardContent>
    </Card>
  );
}
