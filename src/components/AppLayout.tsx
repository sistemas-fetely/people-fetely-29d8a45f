import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";
import { SystemReadinessBanner } from "@/components/shared/SystemReadinessBanner";
import { ReportarErroBotao } from "@/components/shared/ReportarErroBotao";
import { useRegistrarNavegacao } from "@/hooks/useRegistrarNavegacao";
import { CommandPaletteProvider } from "@/components/navegacao/CommandPaletteProvider";

export function AppLayout() {
  useRegistrarNavegacao();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto relative">
            <SystemReadinessBanner somenteCriticos className="mb-4" />
            <Outlet />
            <ReportarErroBotao />
          </main>
        </div>
      </div>
      <CommandPaletteProvider />
    </SidebarProvider>
  );
}
