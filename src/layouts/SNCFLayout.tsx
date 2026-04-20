import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SNCFSidebar } from "@/components/SNCFSidebar";
import { ReportarErroBotao } from "@/components/shared/ReportarErroBotao";
import { useTrackPageVisit } from "@/hooks/useTrackPageVisit";
import { RecentesEFavoritos } from "@/components/navegacao/RecentesEFavoritos";

export default function SNCFLayout() {
  useTrackPageVisit();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SNCFSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border bg-card px-4">
            <SidebarTrigger />
            <div className="ml-auto">
              <RecentesEFavoritos />
            </div>
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background relative">
            <Outlet />
            <ReportarErroBotao />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
