/**
 * ProdutoSidebar — Sistema novo cravado em 29/04/2026.
 *
 * Status: PLACEHOLDER. Sistema vazio — será construído depois.
 * Sidebar mínimo com Tarefas + mensagem "Em breve".
 *
 * Doutrina: criar pilar com placeholder explícito é melhor que esconder.
 * Quando a equipe de Produto entrar em ação, este sidebar nasce com itens reais.
 */

import { Gift, ClipboardList, UsersRound, Construction } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { cn } from "@/lib/utils";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { getHighestRoleLabel } from "@/lib/user-role";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarGroupLabel, SidebarMenu, SidebarMenuButton, SidebarMenuItem,
  SidebarHeader, SidebarFooter, useSidebar,
} from "@/components/ui/sidebar";

const PRODUTO_COLOR = "#C77CA0"; // rosa Fetely

export function ProdutoSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const { roles } = useAuth();
  const primaryRole = getHighestRoleLabel(roles);
  const location = useLocation();

  return (
    <Sidebar collapsible="icon" className="border-r-0">
      <SidebarHeader className="p-5">
        <div className="flex items-center gap-3">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl shadow-sm"
            style={{ backgroundColor: PRODUTO_COLOR }}
          >
            <Gift className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="text-sm font-bold text-sidebar-foreground tracking-tight">Produto Fetély</span>
              <span className="text-[11px] text-sidebar-muted">Em construção</span>
            </div>
          )}
        </div>
      </SidebarHeader>

      <SidebarContent className="px-2 space-y-1">
        {/* Tarefas — acesso direto */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild>
                  <NavLink
                    to="/tarefas"
                    end
                    className={cn(
                      "flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200",
                      location.pathname === "/tarefas" && "bg-sidebar-accent text-sidebar-foreground font-medium border-l-[3px] shadow-sm"
                    )}
                    style={location.pathname === "/tarefas" ? { borderLeftColor: PRODUTO_COLOR, color: PRODUTO_COLOR } : undefined}
                  >
                    <ClipboardList className="h-[18px] w-[18px] shrink-0" style={location.pathname === "/tarefas" ? { color: PRODUTO_COLOR } : undefined} />
                    {!collapsed && <span>Minhas Tarefas</span>}
                  </NavLink>
                </SidebarMenuButton>
              </SidebarMenuItem>
              {roles.some((r) => ["gestor_direto", "gestor_rh", "admin_rh", "super_admin"].includes(r)) && (
                <SidebarMenuItem>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to="/tarefas/time"
                      className="flex items-center gap-3 rounded-xl px-4 py-2.5 text-sm text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-foreground transition-all duration-200"
                    >
                      <UsersRound className="h-[18px] w-[18px] shrink-0" />
                      {!collapsed && <span>Tarefas do Time</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
        <div className="mx-4 border-t border-sidebar-border/40" />

        <SidebarGroup>
          <SidebarGroupContent>
            {!collapsed && (
              <div className="px-4 py-6 text-center">
                <Construction className="h-8 w-8 text-sidebar-muted mx-auto mb-3" />
                <p className="text-xs text-sidebar-muted">
                  Pilar Produto em construção.
                </p>
                <p className="text-[10px] text-sidebar-muted/70 mt-2">
                  Será habilitado quando a equipe de Produto definir os primeiros módulos.
                </p>
              </div>
            )}
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        {!collapsed && primaryRole && (
          <Badge variant="outline" className="text-[10px] w-fit border-sidebar-border/60 text-sidebar-muted">
            {primaryRole}
          </Badge>
        )}
      </SidebarFooter>
    </Sidebar>
  );
}
