import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Settings as SettingsIcon } from "lucide-react";

const SettingsPage = () => (
  <div className="space-y-6">
    <div>
      <h1 className="text-2xl font-bold font-mono tracking-tight">Settings</h1>
      <p className="text-sm text-muted-foreground">Configure your account, API keys, and notifications</p>
    </div>
    <Card className="bg-card border-border">
      <CardContent className="flex flex-col items-center justify-center py-16 gap-4">
        <SettingsIcon className="h-12 w-12 text-muted-foreground" />
        <p className="text-sm text-muted-foreground font-mono">Settings panel — available after auth setup</p>
      </CardContent>
    </Card>
  </div>
);

export default SettingsPage;
