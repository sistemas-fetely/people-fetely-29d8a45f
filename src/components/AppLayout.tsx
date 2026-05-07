import { useEffect } from "react";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { AppHeader } from "@/components/AppHeader";
import { Outlet } from "react-router-dom";
import { SystemReadinessBanner } from "@/components/shared/SystemReadinessBanner";
import { ReportarErroBotao } from "@/components/shared/ReportarErroBotao";
import { useRegistrarNavegacao } from "@/hooks/useRegistrarNavegacao";
import { CommandPaletteProvider } from "@/components/navegacao/CommandPaletteProvider";

// Pré-carrega chunks lazy das telas mais usadas em idle.
// Acontece uma vez quando o AppLayout monta (após login).
function usePrefetchTelasPrincipais() {
  useEffect(() => {
    // ===== ONDA 1 (50ms): telas mais frequentes =====
    const onda1 = setTimeout(() => {
      void import("@/pages/administrativo/InvestimentoLancamento");
      void import("@/pages/administrativo/FluxoFuturoInvestimento");
      void import("@/pages/administrativo/ContasPagar");
      void import("@/pages/administrativo/ContasReceber");
      void import("@/pages/administrativo/CaixaBanco");
      void import("@/pages/administrativo/PlanoDeContas");
      void import("@/pages/administrativo/Parceiros");
      void import("@/pages/administrativo/DashboardFinanceiro");
      void import("@/pages/administrativo/Contratos");
      void import("@/pages/administrativo/GED");
      void import("@/components/ged/PastaDetalhe");
      void import("@/pages/TarefasDoTime");
    }, 50);

    // ===== ONDA 2 (1500ms): telas secundárias =====
    const onda2 = setTimeout(() => {
      void import("@/pages/administrativo/FluxoCaixa");
      void import("@/pages/administrativo/FluxoCaixaFuturo");
      void import("@/pages/administrativo/Compromissos");
      void import("@/pages/administrativo/NFsStage");
      void import("@/pages/administrativo/ImportarDados");
      void import("@/pages/Colaboradores");
      void import("@/pages/Movimentacoes");
      void import("@/pages/Recrutamento");
      void import("@/pages/Ferias");
      void import("@/pages/Processos");
      void import("@/pages/FalaFetely");
      void import("@/pages/DocumentacaoGeral");
      void import("@/pages/Parametros");
      void import("@/pages/Dashboard");
    }, 1500);

    return () => {
      clearTimeout(onda1);
      clearTimeout(onda2);
    };
  }, []);
}

export function AppLayout() {
  useRegistrarNavegacao();
  usePrefetchTelasPrincipais();
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <div className="flex-1 flex flex-col">
          <AppHeader />
          <main className="flex-1 p-6 overflow-auto relative">
            <SystemReadinessBanner somenteCriticos className="mb-4" />
            <Outlet />
            <ReportarErroBotao />
          </main>
        </div>
      </div>
      <CommandPaletteProvider />
    </SidebarProvider>
  );
}
