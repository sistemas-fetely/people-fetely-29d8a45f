import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import * as LucideIcons from "lucide-react";
import { LogOut, LayoutGrid, Lock, ExternalLink, ClipboardList } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import logoFetely from "@/assets/logo_fetely.jpg";
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
  const { user, profile, signOut } = useAuth();
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

  const initials = profile?.full_name
    ? profile.full_name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : user?.email?.slice(0, 2).toUpperCase() || "??";

  const displayName = profile?.full_name || user?.email || "Usuário";

  const handleEnter = (sistema: Sistema) => {
    if (!hasAccess(sistema.id)) return;
    if (sistema.rota_base.startsWith("http")) {
      window.open(sistema.rota_base, "_blank");
    } else {
      navigate(sistema.rota_base);
    }
  };

  const isExternal = (sistema: Sistema) => sistema.rota_base.startsWith("http");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src={logoFetely} alt="Fetély" className="h-10 w-10 rounded-xl object-contain" />
            <div className="flex flex-col">
              <span className="text-base font-bold tracking-tight" style={{ color: "#1A4A3A" }}>
                Fetély.
              </span>
              <span className="text-xs text-muted-foreground">Sistema Nervoso Central</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2">
              <div
                className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold text-primary-foreground shadow-sm"
                style={{ backgroundColor: "#1A4A3A" }}
              >
                {initials}
              </div>
              <span className="text-sm font-medium">{displayName}</span>
            </div>
            <Button variant="ghost" size="sm" onClick={signOut} className="gap-2">
              <LogOut className="h-4 w-4" />
              Sair
            </Button>
          </div>
        </div>
      </header>

      {/* Main */}
      <main className="flex-1 max-w-6xl mx-auto w-full px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold tracking-tight mb-2">Bem-vindo ao SNCF</h1>
          <p className="text-muted-foreground">
            Selecione um sistema para entrar. Você só pode acessar os sistemas em que tem permissão.
          </p>
        </div>

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
                  {/* Top color bar */}
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

        {/* Ações rápidas */}
        <div className="mt-12">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">
            Ações rápidas
          </h2>
          <button
            onClick={() => navigate("/tarefas")}
            className="group flex items-center gap-3 rounded-xl border border-border bg-card px-5 py-4 hover:shadow-md transition-all w-full md:w-auto"
          >
            <div
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ backgroundColor: "#1A4A3A15" }}
            >
              <ClipboardList className="h-5 w-5" style={{ color: "#1A4A3A" }} />
            </div>
            <div className="flex-1 text-left">
              <p className="text-sm font-semibold">Minhas Tarefas</p>
              <p className="text-xs text-muted-foreground">Inbox unificado de pendências</p>
            </div>
            {totalPendentes > 0 && (
              <Badge style={{ backgroundColor: "#1A4A3A" }} className="text-white">
                {totalPendentes}
              </Badge>
            )}
          </button>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-4">
        <div className="max-w-6xl mx-auto px-6 text-center text-xs text-muted-foreground">
          SNCF — Sistema Nervoso Central Fetely
        </div>
      </footer>
    </div>
  );
}
