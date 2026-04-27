import { Navigate, Outlet, useNavigate } from "react-router-dom";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AdminSidebar } from "@/components/AdminSidebar";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Loader2, Shield, Home } from "lucide-react";
import { useTrackPageVisit } from "@/hooks/useTrackPageVisit";
import { RecentesEFavoritos } from "@/components/navegacao/RecentesEFavoritos";
import { CommandPaletteProvider } from "@/components/navegacao/CommandPaletteProvider";
import { ReportarErroBotao } from "@/components/shared/ReportarErroBotao";

export default function AdminLayout() {
  const { user, roles, loading } = useAuth();
  const navigate = useNavigate();
  useTrackPageVisit();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  const hasAccess = roles.includes("super_admin") || roles.includes("admin_rh");
  if (!hasAccess) {
    return <Navigate to="/sem-permissao" replace />;
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AdminSidebar />
        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center gap-3 border-b px-4 bg-card">
            <SidebarTrigger />
            {/* Saída pro Portal — ação de retorno sempre visível */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/sncf")}
              className="gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            >
              <Home className="h-3.5 w-3.5" />
              Voltar ao Portal
            </Button>
            <span className="text-muted-foreground/40">|</span>
            <Shield className="h-4 w-4 text-muted-foreground" />
            <h1 className="text-sm font-semibold">ADM SNCF</h1>
            <div className="ml-auto">
              <RecentesEFavoritos />
            </div>
          </header>
          <main className="flex-1 overflow-auto relative">
            <Outlet />
            <ReportarErroBotao />
          </main>
        </div>
      </div>
      <CommandPaletteProvider />
    </SidebarProvider>
  );
}
