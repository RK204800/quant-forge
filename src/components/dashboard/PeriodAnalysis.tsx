import { useState } from "react";
import { Trade } from "@/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TradePnlChart } from "./TradePnlChart";
import { TimeOfDayChart } from "./TimeOfDayChart";
import { DayOfWeekChart } from "./DayOfWeekChart";
import { PeriodBarChart } from "./PeriodBarChart";

interface PeriodAnalysisProps {
  trades: Trade[];
}

export function PeriodAnalysis({ trades }: PeriodAnalysisProps) {
  return (
    <Card className="bg-card border-border">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground uppercase tracking-wider">Period Analysis</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="trades" className="w-full">
          <TabsList className="bg-muted mb-4">
            <TabsTrigger value="trades" className="text-xs font-mono">Trades</TabsTrigger>
            <TabsTrigger value="tod" className="text-xs font-mono">Time of Day</TabsTrigger>
            <TabsTrigger value="dow" className="text-xs font-mono">Day of Week</TabsTrigger>
            <TabsTrigger value="daily" className="text-xs font-mono">Daily</TabsTrigger>
            <TabsTrigger value="weekly" className="text-xs font-mono">Weekly</TabsTrigger>
            <TabsTrigger value="monthly" className="text-xs font-mono">Monthly</TabsTrigger>
          </TabsList>
          <TabsContent value="trades"><TradePnlChart trades={trades} /></TabsContent>
          <TabsContent value="tod"><TimeOfDayChart trades={trades} /></TabsContent>
          <TabsContent value="dow"><DayOfWeekChart trades={trades} /></TabsContent>
          <TabsContent value="daily"><PeriodBarChart trades={trades} period="daily" /></TabsContent>
          <TabsContent value="weekly"><PeriodBarChart trades={trades} period="weekly" /></TabsContent>
          <TabsContent value="monthly"><PeriodBarChart trades={trades} period="monthly" /></TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
