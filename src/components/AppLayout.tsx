import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";
import { SystemReadinessBanner } from "@/components/shared/SystemReadinessBanner";

export function AppLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto">
            <SystemReadinessBanner somenteCriticos className="mb-4" />
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
