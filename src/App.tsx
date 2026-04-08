import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Colaboradores from "@/pages/Colaboradores";
import PlaceholderPage from "@/pages/PlaceholderPage";
import NotFound from "@/pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/colaboradores" element={<Colaboradores />} />
            <Route path="/organograma" element={<PlaceholderPage title="Organograma" description="Visualização hierárquica da empresa" />} />
            <Route path="/folha-pagamento" element={<PlaceholderPage title="Folha de Pagamento" description="Gestão da folha de pagamento CLT" />} />
            <Route path="/ferias" element={<PlaceholderPage title="Férias" description="Controle de férias e períodos aquisitivos" />} />
            <Route path="/ponto" element={<PlaceholderPage title="Controle de Ponto" description="Apuração de horas e banco de horas" />} />
            <Route path="/beneficios" element={<PlaceholderPage title="Benefícios" description="Gestão de benefícios CLT" />} />
            <Route path="/contratos-pj" element={<PlaceholderPage title="Contratos PJ" description="Gestão de contratos de prestadores" />} />
            <Route path="/notas-fiscais" element={<PlaceholderPage title="Notas Fiscais" description="Workflow de aprovação e upload de NFs" />} />
            <Route path="/pagamentos-pj" element={<PlaceholderPage title="Pagamentos PJ" description="Controle de pagamentos a prestadores" />} />
            <Route path="/recrutamento" element={<PlaceholderPage title="Recrutamento e Seleção" description="Kanban de vagas e candidatos" />} />
            <Route path="/avaliacoes" element={<PlaceholderPage title="Avaliações de Desempenho" description="Ciclos de avaliação e PDI" />} />
            <Route path="/treinamentos" element={<PlaceholderPage title="Treinamentos" description="Controle de capacitação e certificados" />} />
            <Route path="/relatorios" element={<PlaceholderPage title="Relatórios e BI" description="Relatórios gerenciais e exportação" />} />
            <Route path="/configuracoes" element={<PlaceholderPage title="Configurações" description="Parâmetros do sistema e permissões" />} />
          </Route>
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
