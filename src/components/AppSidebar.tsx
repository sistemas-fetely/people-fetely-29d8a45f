import {
  LayoutDashboard, Users, FileText, Calendar, ClipboardList, Award,
  GraduationCap, GitBranch, BarChart3, Settings, UserCircle, CreditCard,
  Briefcase, LogOut, ArrowUpDown, Send, UserCheck,
} from "lucide-react";
import logoFetely from "@/assets/logo_fetely.jpg";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { usePermissions } from "@/hooks/usePermissions";
import { Badge } from "@/components/ui/badge";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";
import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

const roleLabels: Record<AppRole, string> = {
  super_admin: "Super Admin",
  gestor_rh: "Gestor RH",
  gestor_direto: "Gestor",
  colaborador: "Colaborador",
  financeiro: "Financeiro",
};

// Each item maps to a permission module for filtering
interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  permModule?: string; // permission module key — if absent, always visible
}

const mainItems: MenuItem[] = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, permModule: "dashboard" },
  { title: "Pessoas", url: "/pessoas", icon: Users, permModule: "colaboradores" },
  { title: "Organograma", url: "/organograma", icon: GitBranch, permModule: "organograma" },
  { title: "Férias", url: "/ferias", icon: Calendar, permModule: "ferias" },
  { title: "Benefícios", url: "/beneficios", icon: Award, permModule: "beneficios" },
  { title: "Movimentações", url: "/movimentacoes", icon: ArrowUpDown, permModule: "movimentacoes" },
];

const cltItems: MenuItem[] = [
  { title: "Colaboradores CLT", url: "/colaboradores", icon: Users, permModule: "colaboradores" },
  { title: "Folha de Pagamento", url: "/folha-pagamento", icon: FileText, permModule: "folha_pagamento" },
  { title: "Ponto", url: "/ponto", icon: ClipboardList, permModule: "folha_pagamento" },
];

const pjItems: MenuItem[] = [
  { title: "Colaboradores PJ", url: "/contratos-pj", icon: Briefcase, permModule: "contratos_pj" },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileText, permModule: "notas_fiscais" },
  { title: "Pagamentos PJ", url: "/pagamentos-pj", icon: CreditCard, permModule: "pagamentos_pj" },
];

const rhItems: MenuItem[] = [
  { title: "Convites Cadastro", url: "/convites-cadastro", icon: Send, permModule: "convites" },
  { title: "Recrutamento", url: "/recrutamento", icon: UserCircle, permModule: "recrutamento" },
  { title: "Avaliações", url: "/avaliacoes", icon: Award, permModule: "avaliacoes" },
  { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap, permModule: "treinamentos" },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, permModule: "relatorios" },
];

const adminItems: MenuItem[] = [
  { title: "Parâmetros Gerais", url: "/parametros?modulo=geral", icon: Settings, permModule: "parametros" },
  { title: "Parâmetros CLT", url: "/parametros?modulo=clt", icon: Settings, permModule: "parametros" },
  { title: "Parâmetros PJ", url: "/parametros?modulo=pj", icon: Settings, permModule: "parametros" },
  { title: "Configurações", url: "/configuracoes", icon: Settings, permModule: "usuarios" },
  { title: "Gerenciar Usuários", url: "/gerenciar-usuarios", icon: UserCheck, permModule: "usuarios" },
];

interface MenuGroupProps {
  label: string;
  items: MenuItem[];
  collapsed: boolean;
  canViewModule: (mod: string) => boolean;
}

function MenuGroup({ label, items, collapsed, canViewModule }: MenuGroupProps) {
  const location = useLocation();
  const visibleItems = items.filter((item) => {
    if (!item.permModule) return true;
    return canViewModule(item.permModule);
  });

  if (visibleItems.length === 0) return null;

  const isItemActive = (url: string) => {
    if (url.includes("?")) {
      const [path, query] = url.split("?");
      return location.pathname === path && location.search === `?${query}`;
    }
    return url === "/" ? location.pathname === "/" : location.pathname === url;
  };

  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {visibleItems.map((item) => {
            const active = isItemActive(item.url);
            return (
              <SidebarMenuItem key={item.url}>
                <SidebarMenuButton asChild>
                  <NavLink
                    to={item.url}
                    end={item.url === "/"}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors",
                      active && "bg-sidebar-accent text-sidebar-primary font-medium"
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" />
                    {!collapsed && <span>{item.title}</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { user, roles, profile, signOut } = useAuth();
  const { canView } = usePermissions();

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  const displayName = profile?.full_name || user?.email || "Usuário";
  const primaryRole = roles[0] ? roleLabels[roles[0]] : "Colaborador";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <img src={logoFetely} alt="Fetély" className="h-8 w-8 shrink-0 rounded-lg object-contain" />
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">People Fetély</span>
              <span className="text-xs text-sidebar-muted">Gestão de Pessoas</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <MenuGroup label="Principal" items={mainItems} collapsed={collapsed} canViewModule={canView} />
        <MenuGroup label="CLT" items={cltItems} collapsed={collapsed} canViewModule={canView} />
        <MenuGroup label="PJ" items={pjItems} collapsed={collapsed} canViewModule={canView} />
        <MenuGroup label="RH" items={rhItems} collapsed={collapsed} canViewModule={canView} />
        <MenuGroup label="Admin" items={adminItems} collapsed={collapsed} canViewModule={canView} />
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="space-y-2">
            <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
                {initials}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-medium text-sidebar-foreground truncate">{displayName}</span>
                <Badge variant="outline" className="text-[10px] w-fit border-sidebar-border text-sidebar-muted">
                  {primaryRole}
                </Badge>
              </div>
            </div>
            <button
              onClick={signOut}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-xs text-sidebar-muted hover:bg-sidebar-accent hover:text-sidebar-foreground transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" />
              Sair
            </button>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
