import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";
import { LayoutGrid, Lock, ExternalLink, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface Sistema {
  id: string;
  slug: string;
  nome: string;
  descricao: string | null;
  icone: string;
  cor: string;
  ativo: boolean;
  ordem: number;
  rota_base: string;
}

interface UserSystem {
  sistema_id: string;
  ativo: boolean;
}

function getIcon(name: string) {
  // Convert kebab-case to PascalCase (e.g., "layout-grid" → "LayoutGrid")
  const pascal = name
    .split("-")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join("");
  const Icon = (LucideIcons as unknown as Record<string, React.ComponentType<{ className?: string }>>)[pascal];
  return Icon || LayoutGrid;
}

export default function PortalSNCF() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [sistemas, setSistemas] = useState<Sistema[]>([]);
  const [userSystems, setUserSystems] = useState<UserSystem[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalPendentes, setTotalPendentes] = useState(0);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const [sistemasRes, userSystemsRes, tarefasRes] = await Promise.all([
        supabase.from("sncf_sistemas").select("*").eq("ativo", true).order("ordem"),
        supabase.from("sncf_user_systems").select("sistema_id, ativo").eq("user_id", user.id),
        supabase
          .from("sncf_tarefas")
          .select("id", { count: "exact", head: true })
          .eq("responsavel_user_id", user.id)
          .in("status", ["pendente", "atrasada", "em_andamento"]),
      ]);
      if (sistemasRes.data) setSistemas(sistemasRes.data as Sistema[]);
      if (userSystemsRes.data) setUserSystems(userSystemsRes.data as UserSystem[]);
      setTotalPendentes(tarefasRes.count ?? 0);
      setLoading(false);
    };
    void load();
  }, [user]);

  const hasAccess = (sistemaId: string) =>
    userSystems.some((us) => us.sistema_id === sistemaId && us.ativo);

  const handleEnter = (sistema: Sistema) => {
    if (!hasAccess(sistema.id)) return;
    if (sistema.rota_base.startsWith("http")) {
      window.open(sistema.rota_base, "_blank");
    } else {
      // Rastreia último sistema visitado para o botão "Voltar" do SNCFSidebar
      if (sistema.slug === "people" || sistema.slug === "ti") {
        sessionStorage.setItem("sncf_last_system", sistema.slug);
      }
      navigate(sistema.rota_base);
    }
  };

  const isExternal = (sistema: Sistema) => sistema.rota_base.startsWith("http");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight mb-2">Bem-vindo ao SNCF</h1>
        <p className="text-muted-foreground">
          Selecione um sistema para entrar. Você só pode acessar os sistemas em que tem permissão.
        </p>
      </div>

      {/* Centro de Trabalho — destaque */}
      <button
        onClick={() => navigate("/tarefas")}
        className="group w-full rounded-2xl border-2 bg-card p-6 hover:shadow-lg transition-all text-left flex items-center gap-5"
        style={{ borderColor: "#1A4A3A" }}
      >
        <div
          className="flex h-16 w-16 items-center justify-center rounded-2xl flex-shrink-0"
          style={{ backgroundColor: "#1A4A3A" }}
        >
          <ClipboardList className="h-8 w-8 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs uppercase tracking-wider font-semibold text-muted-foreground mb-1">
            Centro de Trabalho
          </p>
          <h2 className="text-xl font-bold mb-1" style={{ color: "#1A4A3A" }}>Minhas Tarefas</h2>
          {totalPendentes > 0 ? (
            <p className="text-sm text-muted-foreground">
              Você tem <span className="font-semibold text-foreground">{totalPendentes}</span> tarefa(s) ativa(s)
            </p>
          ) : (
            <p className="text-sm text-success font-medium">Tudo em dia!</p>
          )}
        </div>
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: "#1A4A3A" }}>
          Ver tarefas <ExternalLink className="h-4 w-4 group-hover:translate-x-0.5 transition-transform" />
        </div>
      </button>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {[1, 2].map((i) => (
            <div key={i} className="h-48 rounded-xl border border-border bg-card animate-pulse" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {sistemas.map((sistema) => {
            const Icon = getIcon(sistema.icone);
            const accessible = hasAccess(sistema.id);
            return (
              <button
                key={sistema.id}
                onClick={() => handleEnter(sistema)}
                disabled={!accessible}
                className={cn(
                  "group relative overflow-hidden rounded-xl border border-border bg-card text-left transition-all duration-200",
                  accessible
                    ? "hover:shadow-lg hover:-translate-y-0.5 cursor-pointer"
                    : "opacity-50 cursor-not-allowed"
                )}
              >
                <div className="h-1.5 w-full" style={{ backgroundColor: sistema.cor }} />
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="flex h-14 w-14 items-center justify-center rounded-xl"
                      style={{ backgroundColor: `${sistema.cor}15` }}
                    >
                      <Icon className="h-7 w-7" style={{ color: sistema.cor }} />
                    </div>
                    <div className="flex items-center gap-2">
                      {isExternal(sistema) && accessible && (
                        <ExternalLink className="h-4 w-4 text-muted-foreground" aria-label="Link externo" />
                      )}
                      {!accessible && (
                        <Badge variant="outline" className="gap-1">
                          <Lock className="h-3 w-3" />
                          Sem acesso
                        </Badge>
                      )}
                    </div>
                  </div>
                  <h2 className="text-xl font-bold mb-1">{sistema.nome}</h2>
                  {sistema.descricao && (
                    <p className="text-sm text-muted-foreground">{sistema.descricao}</p>
                  )}
                  {accessible && (
                    <div
                      className="mt-4 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
                      style={{ color: sistema.cor }}
                    >
                      {isExternal(sistema) ? "Abrir" : "Entrar"} →
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

