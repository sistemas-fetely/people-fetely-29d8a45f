import {
  Settings2, ClipboardList, UsersRound, UserCog, LayoutTemplate, ChevronDown, Sparkles, BookOpen,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
          <Settings2 className="h-[18px] w-[18px] shrink-0" />
          {!collapsed && (
            <>
              <span>Administração</span>
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
            onClick={() => navigate("/fala-fetely")}
          >
            <Sparkles className="h-4 w-4" style={{ color: "#E91E63" }} />
            <span className="flex-1 text-left">Fala Fetely</span>
            <Badge className="text-[9px] px-1.5 py-0 h-4 border-0" style={{ backgroundColor: "#E91E63", color: "white" }}>
              Novo
            </Badge>
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
                onClick={() => navigate("/processos")}
              >
                <LayoutTemplate className="h-4 w-4" /> Processos
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="w-full justify-start gap-2 text-sm"
                onClick={() => navigate("/fala-fetely/conhecimento")}
              >
                <BookOpen className="h-4 w-4" /> Base de Conhecimento
              </Button>
            </>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
