import { useLocation } from "react-router-dom";
import {
  Banknote, Sliders, Settings, UserCog, MessageSquareWarning, Shield, Home, FileText,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const ADMIN_COLOR = "#1A4A3A";

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string; style?: React.CSSProperties }>;
  end?: boolean;
}

// Grupo 1: Pessoas & Cargos
const pessoasItems: MenuItem[] = [
  { title: "Cargos e Salários", url: "/admin/cargos", icon: Banknote },
  { title: "Gerenciar Usuários", url: "/admin/usuarios", icon: UserCog },
];

// Grupo 2: Sistema
const sistemaItems: MenuItem[] = [
  { title: "Parâmetros", url: "/admin/parametros", icon: Sliders },
  { title: "Configurações", url: "/admin/configuracoes", icon: Settings },
];

// Grupo 3: Saúde do Sistema
const monitoramentoItems: MenuItem[] = [
  { title: "Reportes do Sistema", url: "/admin/reportes", icon: MessageSquareWarning },
  { title: "Importações PDF", url: "/admin/importacoes-pdf", icon: FileText },
];

export function AdminSidebar() {
  const location = useLocation();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isItemActive = (url: string, end?: boolean) =>
    end ? location.pathname === url : location.pathname.startsWith(url);

  const renderMenuItem = (item: MenuItem) => {
    const active = isItemActive(item.url, item.end);
    return (
      <SidebarMenuItem key={item.url}>
        <SidebarMenuButton asChild>
          <NavLink
            to={item.url}
            end={item.end}
            className={cn(
              "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200",
              active && "bg-sidebar-accent text-sidebar-foreground font-medium border-l-[3px] shadow-sm"
            )}
            style={active ? { borderLeftColor: ADMIN_COLOR, color: ADMIN_COLOR } : undefined}
          >
            <item.icon className="h-[18px] w-[18px] shrink-0" style={active ? { color: ADMIN_COLOR } : undefined} />
            {!collapsed && <span>{item.title}</span>}
          </NavLink>
        </SidebarMenuButton>
      </SidebarMenuItem>
    );
  };

  const renderGroup = (label: string, items: MenuItem[]) => (
    <SidebarGroup>
      {!collapsed && (
        <SidebarGroupLabel className="text-sidebar-muted text-[10px] uppercase tracking-widest font-semibold mb-1 px-4">
          {label}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>{items.map(renderMenuItem)}</SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ backgroundColor: ADMIN_COLOR }}
          >
            <Shield className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold tracking-tight" style={{ color: ADMIN_COLOR }}>
                ADM SNCF
              </span>
              <span className="text-[11px] text-sidebar-muted">Configurações globais</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 space-y-1">
        {renderGroup("Pessoas & Cargos", pessoasItems)}
        <div className="mx-4 border-t border-sidebar-border/40" />
        {renderGroup("Sistema", sistemaItems)}
        <div className="mx-4 border-t border-sidebar-border/40" />
        {renderGroup("Saúde do Sistema", monitoramentoItems)}
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {/* Voltar ao Portal — link visível mesmo colapsado */}
        <NavLink
          to="/sncf"
          className="flex items-center gap-2 px-2 py-1.5 rounded-md text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
        >
          <Home className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && <span>Portal Uauuu</span>}
        </NavLink>

        {!collapsed && (
          <Badge variant="outline" className="text-[10px] w-fit border-sidebar-border/60 text-sidebar-muted">
            Área restrita
          </Badge>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
