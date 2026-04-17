import { Outlet } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { SNCFSidebar } from "@/components/SNCFSidebar";

export default function SNCFLayout() {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <SNCFSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b border-border bg-card px-4">
            <SidebarTrigger />
          </header>
          <main className="flex-1 p-6 overflow-auto bg-background">
            <Outlet />
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
