import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// Mapa de rotas → títulos legíveis + pilar
const ROUTE_MAP: Record<string, { titulo: string; pilar: "sncf" | "people" | "ti" | "admin" }> = {
  "/sncf": { titulo: "Portal Uauuu", pilar: "sncf" },
  "/dashboard": { titulo: "Dashboard People", pilar: "people" },
  "/pessoas": { titulo: "Pessoas", pilar: "people" },
  "/colaboradores": { titulo: "Colaboradores", pilar: "people" },
  "/contratos-pj": { titulo: "Contratos PJ", pilar: "people" },
  "/recrutamento": { titulo: "Recrutamento", pilar: "people" },
  "/convites-cadastro": { titulo: "Convites de Cadastro", pilar: "people" },
  "/onboarding": { titulo: "Onboarding", pilar: "people" },
  "/movimentacoes": { titulo: "Movimentações", pilar: "people" },
  "/folha-pagamento": { titulo: "Folha de Pagamento", pilar: "people" },
  "/pagamentos-pj": { titulo: "Pagamentos PJ", pilar: "people" },
  "/notas-fiscais": { titulo: "Notas Fiscais PJ", pilar: "people" },
  "/ferias": { titulo: "Férias", pilar: "people" },
  "/beneficios": { titulo: "Benefícios", pilar: "people" },
  "/organograma": { titulo: "Organograma", pilar: "people" },
  "/tarefas": { titulo: "Minhas Tarefas", pilar: "sncf" },
  "/tarefas/time": { titulo: "Tarefas do Time", pilar: "sncf" },
  "/processos": { titulo: "Processos", pilar: "sncf" },
  "/documentacao": { titulo: "Documentação", pilar: "sncf" },
  "/fala-fetely": { titulo: "Fala Fetely", pilar: "sncf" },
  "/mural": { titulo: "Mural Fetely", pilar: "sncf" },
  "/ti": { titulo: "Dashboard TI", pilar: "ti" },
  "/admin/cargos": { titulo: "Cargos e Salários", pilar: "admin" },
  "/admin/parametros": { titulo: "Parâmetros", pilar: "admin" },
  "/admin/configuracoes": { titulo: "Configurações", pilar: "admin" },
  "/admin/usuarios": { titulo: "Gerenciar Usuários", pilar: "admin" },
  "/admin/reportes": { titulo: "Reportes do Sistema", pilar: "admin" },
  "/admin/importacoes-pdf": { titulo: "Importações PDF", pilar: "admin" },
};

function resolveRoute(pathname: string): { rota: string; titulo: string; pilar: "sncf" | "people" | "ti" | "admin" } | null {
  if (ROUTE_MAP[pathname]) {
    return { rota: pathname, ...ROUTE_MAP[pathname] };
  }
  const segments = pathname.split("/").filter(Boolean);
  for (let i = segments.length; i > 0; i--) {
    const candidate = "/" + segments.slice(0, i).join("/");
    if (ROUTE_MAP[candidate]) {
      const base = ROUTE_MAP[candidate];
      return { rota: pathname, titulo: base.titulo, pilar: base.pilar };
    }
  }
  return null;
}

/**
 * Hook silencioso — registra cada visita de página em usuario_paginas_recentes.
 * Debounce: não registra a mesma rota 2x em 10 segundos.
 */
export function useTrackPageVisit() {
  const location = useLocation();
  const { user } = useAuth();

  useEffect(() => {
    if (!user?.id) return;

    const info = resolveRoute(location.pathname);
    if (!info) return;

    const debounceKey = `track_${info.rota}`;
    const lastTrack = sessionStorage.getItem(debounceKey);
    if (lastTrack && Date.now() - parseInt(lastTrack) < 10000) return;
    sessionStorage.setItem(debounceKey, Date.now().toString());

    void supabase.from("usuario_paginas_recentes").insert({
      user_id: user.id,
      rota: info.rota,
      titulo: info.titulo,
      pilar: info.pilar,
    });
  }, [location.pathname, user?.id]);
}
