import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "./AppSidebar";
import { TopStatsBar } from "./TopStatsBar";
import { StrategyChatbot } from "@/components/chat/StrategyChatbot";

export function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <header className="flex items-center border-b border-border bg-card/30">
            <SidebarTrigger className="ml-2 text-muted-foreground hover:text-foreground" />
            <TopStatsBar />
          </header>
          <main className="flex-1 overflow-auto p-4 md:p-6">{children}</main>
        </div>
      </div>
      <StrategyChatbot />
    </SidebarProvider>
  );
}
