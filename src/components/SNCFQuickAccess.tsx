import {
  LayoutGrid, ClipboardList, UsersRound, UserCog, LayoutTemplate, ChevronDown,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/contexts/AuthContext";
import { useSidebar } from "@/components/ui/sidebar";

export function SNCFQuickAccess() {
  const navigate = useNavigate();
  const { roles } = useAuth();
  const { state } = useSidebar();
  const collapsed = state === "collapsed";

  const isGestor = roles.some((r) =>
    ["gestor_direto", "gestor_rh", "admin_rh", "super_admin"].includes(r)
  );
  const isAdmin = roles.some((r) => ["admin_rh", "super_admin"].includes(r));

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-3 px-4 py-2.5 h-auto rounded-xl text-sm text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground"
        >
          <LayoutGrid className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span>SNCF</span>
              <ChevronDown className="h-3 w-3 ml-auto opacity-60" />
            </>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-60 p-1" side="right" align="start">
        <div className="space-y-0.5">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => navigate("/sncf")}
          >
            <LayoutGrid className="h-4 w-4" /> Portal SNCF
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-sm"
            onClick={() => navigate("/tarefas")}
          >
            <ClipboardList className="h-4 w-4" /> Minhas Tarefas
          </Button>
          {isGestor && (
            <Button
              variant="ghost"
              size="sm"
              className="w-full justify-start gap-2 text-sm"
              onClick={() => navigate("/tarefas/time")}
            >
              <UsersRound className="h-4 w-4" /> Tarefas do Time
            </Button>
          )}
          {isAdmin && (
            <>
              <Separator className="my-1" />
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground px-2 py-1">
                Administração
              </p>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => navigate("/gerenciar-usuarios")}
              >
                <UserCog className="h-4 w-4" /> Gerenciar Usuários
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => navigate("/templates")}
              >
                <LayoutTemplate className="h-4 w-4" /> Templates de Processos
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
