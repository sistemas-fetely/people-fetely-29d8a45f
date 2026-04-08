import {
  LayoutDashboard, Users, FileText, Calendar, ClipboardList, Award,
  GraduationCap, Building2, GitBranch, BarChart3, Settings, UserCircle,
  Briefcase, ChevronDown,
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const mainItems = [
  { title: "Dashboard", url: "/", icon: LayoutDashboard },
  { title: "Colaboradores", url: "/colaboradores", icon: Users },
  { title: "Organograma", url: "/organograma", icon: GitBranch },
];

const cltItems = [
  { title: "Folha de Pagamento", url: "/folha-pagamento", icon: FileText },
  { title: "Férias", url: "/ferias", icon: Calendar },
  { title: "Ponto", url: "/ponto", icon: ClipboardList },
  { title: "Benefícios", url: "/beneficios", icon: Award },
];

const pjItems = [
  { title: "Contratos PJ", url: "/contratos-pj", icon: Briefcase },
  { title: "Notas Fiscais", url: "/notas-fiscais", icon: FileText },
  { title: "Pagamentos PJ", url: "/pagamentos-pj", icon: BarChart3 },
];

const rhItems = [
  { title: "Recrutamento", url: "/recrutamento", icon: UserCircle },
  { title: "Avaliações", url: "/avaliacoes", icon: Award },
  { title: "Treinamentos", url: "/treinamentos", icon: GraduationCap },
  { title: "Relatórios", url: "/relatorios", icon: BarChart3 },
];

const adminItems = [
  { title: "Configurações", url: "/configuracoes", icon: Settings },
];

interface MenuGroupProps {
  label: string;
  items: { title: string; url: string; icon: React.ComponentType<{ className?: string }> }[];
  collapsed: boolean;
}

function MenuGroup({ label, items, collapsed }: MenuGroupProps) {
  const location = useLocation();
  return (
    <SidebarGroup>
      {!collapsed && <SidebarGroupLabel className="text-sidebar-muted text-xs uppercase tracking-wider">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url}>
              <SidebarMenuButton asChild>
                <NavLink
                  to={item.url}
                  end={item.url === "/"}
                  className="flex items-center gap-3 rounded-md px-3 py-2 text-sm text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                  activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                >
                  <item.icon className="h-4 w-4 shrink-0" />
                  {!collapsed && <span>{item.title}</span>}
                </NavLink>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

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
        <MenuGroup label="Principal" items={mainItems} collapsed={collapsed} />
        <MenuGroup label="CLT" items={cltItems} collapsed={collapsed} />
        <MenuGroup label="PJ" items={pjItems} collapsed={collapsed} />
        <MenuGroup label="RH" items={rhItems} collapsed={collapsed} />
        <MenuGroup label="Admin" items={adminItems} collapsed={collapsed} />
      </SidebarContent>
      <SidebarFooter className="p-4">
        {!collapsed && (
          <div className="flex items-center gap-3 rounded-lg bg-sidebar-accent p-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-sidebar-primary text-xs font-semibold text-sidebar-primary-foreground">
              AD
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-medium text-sidebar-foreground">Admin</span>
              <span className="text-xs text-sidebar-muted">admin@empresa.com</span>
            </div>
          </div>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
