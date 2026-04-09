import {
  LayoutDashboard, Users, FileText, Calendar, ClipboardList, Award,
  GraduationCap, Building2, GitBranch, BarChart3, Settings, UserCircle,
  Briefcase, LogOut, ArrowUpDown, Send, UserCheck,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
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

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard, roles: [] as AppRole[] },
  { title: "Pessoas", url: "/pessoas", icon: Users, roles: [] as AppRole[] },
  { title: "Organograma", url: "/organograma", icon: GitBranch, roles: [] as AppRole[] },
  { title: "Férias", url: "/ferias", icon: Calendar, roles: [] as AppRole[] },
  { title: "Movimentações", url: "/movimentacoes", icon: ArrowUpDown, roles: [] as AppRole[] },
];

const cltItems = [
  { title: "Colaboradores CLT", url: "/colaboradores", icon: Users, roles: [] as AppRole[] },
  { title: "Folha de Pagamento", url: "/folha-pagamento", icon: FileText, roles: ["super_admin", "gestor_rh", "financeiro"] as AppRole[] },
  { title: "Ponto", url: "/ponto", icon: ClipboardList, roles: [] as AppRole[] },
  { title: "Benefícios", url: "/beneficios", icon: Award, roles: [] as AppRole[] },
];

const pjItems = [
  { title: "Colaboradores PJ", url: "/contratos-pj", icon: Briefcase, roles: ["super_admin", "gestor_rh", "financeiro"] as AppRole[] },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileText, roles: ["super_admin", "gestor_rh", "financeiro"] as AppRole[] },
];

const rhItems = [
  { title: "Convites Cadastro", url: "/convites-cadastro", icon: Send, roles: ["super_admin", "gestor_rh"] as AppRole[] },
  { title: "Recrutamento", url: "/recrutamento", icon: UserCircle, roles: ["super_admin", "gestor_rh"] as AppRole[] },
  { title: "Avaliações", url: "/avaliacoes", icon: Award, roles: [] as AppRole[] },
  { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap, roles: [] as AppRole[] },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3, roles: ["super_admin", "gestor_rh", "financeiro"] as AppRole[] },
];

const adminItems = [
  { title: "Parâmetros Gerais", url: "/parametros?modulo=geral", icon: Settings, roles: ["super_admin", "gestor_rh"] as AppRole[] },
  { title: "Parâmetros CLT", url: "/parametros?modulo=clt", icon: Settings, roles: ["super_admin", "gestor_rh"] as AppRole[] },
  { title: "Parâmetros PJ", url: "/parametros?modulo=pj", icon: Settings, roles: ["super_admin", "gestor_rh"] as AppRole[] },
  { title: "Configurações", url: "/configuracoes", icon: Settings, roles: ["super_admin"] as AppRole[] },
  { title: "Gerenciar Usuários", url: "/gerenciar-usuarios", icon: UserCheck, roles: ["super_admin"] as AppRole[] },
];

interface MenuItem {
  title: string;
  url: string;
  icon: React.ComponentType<{ className?: string }>;
  roles: AppRole[];
}

interface MenuGroupProps {
  label: string;
  items: MenuItem[];
  collapsed: boolean;
  userRoles: AppRole[];
}

function MenuGroup({ label, items, collapsed, userRoles }: MenuGroupProps) {
  const location = useLocation();
  const visibleItems = items.filter((item) => {
    if (item.roles.length === 0) return true;
    return item.roles.some((r) => userRoles.includes(r));
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

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  const displayName = profile?.full_name || user?.email || "Usuário";
  const primaryRole = roles[0] ? roleLabels[roles[0]] : "Colaborador";

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-sidebar-primary">
            <Building2 className="h-4 w-4 text-sidebar-primary-foreground" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-semibold text-sidebar-foreground">RH System</span>
              <span className="text-xs text-sidebar-muted">Gestão de Pessoas</span>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent className="px-2">
        <MenuGroup label="Principal" items={mainItems} collapsed={collapsed} userRoles={roles} />
        <MenuGroup label="CLT" items={cltItems} collapsed={collapsed} userRoles={roles} />
        <MenuGroup label="PJ" items={pjItems} collapsed={collapsed} userRoles={roles} />
        <MenuGroup label="RH" items={rhItems} collapsed={collapsed} userRoles={roles} />
        <MenuGroup label="Admin" items={adminItems} collapsed={collapsed} userRoles={roles} />
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
