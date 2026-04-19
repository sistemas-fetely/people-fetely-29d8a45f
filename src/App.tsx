import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppLayout } from "@/components/AppLayout";
import Dashboard from "@/pages/Dashboard";
import Colaboradores from "@/pages/Colaboradores";
import Pessoas from "@/pages/Pessoas";
import ColaboradorDetalhe from "@/pages/ColaboradorDetalhe";
import { CadastroColaboradorCLTWrapper } from "@/components/colaborador-clt/CadastroColaboradorCLT";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Organograma from "@/pages/Organograma";
import Login from "@/pages/Login";
import RecuperarSenha from "@/pages/RecuperarSenha";
import ResetPassword from "@/pages/ResetPassword";
import SemPermissao from "@/pages/SemPermissao";
import AguardandoAprovacao from "@/pages/AguardandoAprovacao";
import GerenciarUsuarios from "@/pages/GerenciarUsuarios";
import NotFound from "@/pages/NotFound";
import Parametros from "@/pages/Parametros";
import ContratosPJ from "@/pages/ContratosPJ";
import ContratoPJDetalhe from "@/pages/ContratoPJDetalhe";
import { CadastroContratoPJ } from "@/components/contrato-pj/CadastroContratoPJ";
import NotasFiscais from "@/pages/NotasFiscais";
import NotaFiscalDetalhe from "@/pages/NotaFiscalDetalhe";
import FolhaPagamento from "@/pages/FolhaPagamento";
import Ferias from "@/pages/Ferias";
import FeriasColaborador from "@/pages/FeriasColaborador";
import Beneficios from "@/pages/Beneficios";
import Movimentacoes from "@/pages/Movimentacoes";
import PagamentosPJ from "@/pages/PagamentosPJ";
import PagamentoPJRelatorio from "@/pages/PagamentoPJRelatorio";
import CadastroPublico from "@/pages/CadastroPublico";
import ConvitesCadastro from "@/pages/ConvitesCadastro";
import ConviteDetalhe from "@/pages/ConviteDetalhe";
import Unsubscribe from "@/pages/Unsubscribe";
import ConfigurarPerfis from "@/pages/ConfigurarPerfis";
import Onboarding from "@/pages/Onboarding";
import OnboardingDetalhe from "@/pages/OnboardingDetalhe";
import Recrutamento from "@/pages/Recrutamento";
import RecrutamentoDetalhe from "@/pages/RecrutamentoDetalhe";
import PortalCandidatura from "@/pages/PortalCandidatura";
import VagaPublica from "@/pages/VagaPublica";
import Cargos from "@/pages/Cargos";
import CargoForm from "@/pages/CargoForm";
import CargosEnriquecimento from "@/pages/CargosEnriquecimento";
import EntregaTeste from "@/pages/EntregaTeste";
import PortalSNCF from "@/pages/PortalSNCF";
import TILayout from "@/layouts/TILayout";
import SNCFLayout from "@/layouts/SNCFLayout";
import TIDashboard from "@/pages/ti/TIDashboard";
import TIAtivos from "@/pages/ti/TIAtivos";
import DocumentacaoViva from "@/pages/ti/DocumentacaoViva";
import DocumentacaoDetalhe from "@/pages/ti/DocumentacaoDetalhe";
import DocumentacaoForm from "@/pages/ti/DocumentacaoForm";
import MinhasTarefas from "@/pages/MinhasTarefas";
import TarefasDoTime from "@/pages/TarefasDoTime";
import Processos from "@/pages/Processos";
import ProcessoDetalhe from "@/pages/ProcessoDetalhe";
import ProcessoEditor from "@/pages/ProcessoEditor";
import DesligamentoDetalhe from "@/pages/DesligamentoDetalhe";
import FalaFetely from "@/pages/FalaFetely";
import FalaFetelyConhecimento from "@/pages/fala-fetely/Conhecimento";
import MinhasMemorias from "@/pages/fala-fetely/MinhasMemorias";
import MeusDados from "@/pages/MeusDados";
import MeusAcessos from "@/pages/MeusAcessos";
import SistemaReportes from "@/pages/admin/SistemaReportes";
import GestaoAVista from "@/pages/GestaoAVista";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public routes */}
            <Route path="/login" element={<Login />} />
            <Route path="/recuperar-senha" element={<RecuperarSenha />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route path="/sem-permissao" element={<SemPermissao />} />
            <Route path="/aguardando-aprovacao" element={<AguardandoAprovacao />} />
            <Route path="/cadastro/:token" element={<CadastroPublico />} />
            <Route path="/vagas/:id" element={<VagaPublica />} />
            <Route path="/vagas/:id/candidatura" element={<PortalCandidatura />} />
            <Route path="/vagas/:id/teste" element={<EntregaTeste />} />
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            {/* SNCF — Portal + transversais (Tarefas, Templates, Usuários) */}
            <Route element={<ProtectedRoute><SNCFLayout /></ProtectedRoute>}>
              <Route path="/sncf" element={<PortalSNCF />} />
              <Route path="/tarefas" element={<MinhasTarefas />} />
              <Route path="/tarefas/time" element={<TarefasDoTime />} />
              <Route path="/gerenciar-usuarios" element={
                <ProtectedRoute permModule="usuarios">
                  <GerenciarUsuarios />
                </ProtectedRoute>
              } />
              <Route path="/processos" element={<Processos />} />
              <Route path="/processos/:id" element={<ProcessoDetalhe />} />
              <Route path="/processos/:id/editar" element={<ProcessoEditor />} />
              <Route path="/templates" element={<Navigate to="/processos" replace />} />
              <Route path="/templates/*" element={<Navigate to="/processos" replace />} />
              <Route path="/fala-fetely" element={<FalaFetely />} />
              <Route path="/fala-fetely/conhecimento" element={<FalaFetelyConhecimento />} />
              <Route path="/fala-fetely/memorias" element={<MinhasMemorias />} />
              <Route path="/meus-dados" element={<MeusDados />} />
              <Route path="/meus-acessos" element={<MeusAcessos />} />
            </Route>

            {/* TI Fetely */}
            <Route path="/ti" element={<ProtectedRoute><TILayout /></ProtectedRoute>}>
              <Route index element={<TIDashboard />} />
              <Route path="ativos" element={<TIAtivos />} />
              <Route path="documentacao" element={<DocumentacaoViva />} />
              <Route path="documentacao/novo" element={<DocumentacaoForm />} />
              <Route path="documentacao/:slug" element={<DocumentacaoDetalhe />} />
            </Route>

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Navigate to="/sncf" replace />} />
              <Route path="/dashboard" element={<Dashboard />} />
              <Route path="/gestao-a-vista" element={<GestaoAVista />} />
              <Route path="/desligamento/:id" element={<DesligamentoDetalhe />} />
              <Route path="/pessoas" element={<Pessoas />} />
              <Route path="/colaboradores" element={
                <ProtectedRoute permModule="colaboradores">
                  <Colaboradores />
                </ProtectedRoute>
              } />
              <Route path="/colaboradores/novo" element={
                <ProtectedRoute permModule="colaboradores" permAction="create">
                  <CadastroColaboradorCLTWrapper />
                </ProtectedRoute>
              } />
              <Route path="/colaboradores/:id" element={
                <ProtectedRoute permModule="colaboradores">
                  <ColaboradorDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/organograma" element={
                <ProtectedRoute permModule="organograma">
                  <Organograma />
                </ProtectedRoute>
              } />
              <Route path="/movimentacoes" element={
                <ProtectedRoute permModule="movimentacoes">
                  <Movimentacoes />
                </ProtectedRoute>
              } />

              {/* CLT */}
              <Route path="/folha-pagamento" element={
                <ProtectedRoute permModule="folha_pagamento">
                  <FolhaPagamento />
                </ProtectedRoute>
              } />
              <Route path="/ferias" element={
                <ProtectedRoute permModule="ferias">
                  <Ferias />
                </ProtectedRoute>
              } />
              <Route path="/ferias/colaborador/:id" element={
                <ProtectedRoute permModule="ferias">
                  <FeriasColaborador />
                </ProtectedRoute>
              } />
              <Route path="/ponto" element={
                <ProtectedRoute permModule="folha_pagamento">
                  <PlaceholderPage title="Controle de Ponto" description="Apuração de horas e banco de horas" />
                </ProtectedRoute>
              } />
              <Route path="/beneficios" element={
                <ProtectedRoute permModule="beneficios">
                  <Beneficios />
                </ProtectedRoute>
              } />

              {/* PJ */}
              <Route path="/contratos-pj" element={
                <ProtectedRoute permModule="contratos_pj">
                  <ContratosPJ />
                </ProtectedRoute>
              } />
              <Route path="/contratos-pj/novo" element={
                <ProtectedRoute permModule="contratos_pj" permAction="create">
                  <CadastroContratoPJ />
                </ProtectedRoute>
              } />
              <Route path="/contratos-pj/:id" element={
                <ProtectedRoute permModule="contratos_pj">
                  <ContratoPJDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/notas-fiscais" element={
                <ProtectedRoute permModule="notas_fiscais">
                  <NotasFiscais />
                </ProtectedRoute>
              } />
              <Route path="/notas-fiscais/:id" element={
                <ProtectedRoute permModule="notas_fiscais">
                  <NotaFiscalDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/pagamentos-pj" element={
                <ProtectedRoute permModule="pagamentos_pj">
                  <PagamentosPJ />
                </ProtectedRoute>
              } />
              <Route path="/pagamentos-pj/:contratoId" element={
                <ProtectedRoute permModule="pagamentos_pj">
                  <PagamentoPJRelatorio />
                </ProtectedRoute>
              } />

              {/* RH */}
              <Route path="/convites-cadastro" element={
                <ProtectedRoute permModule="convites">
                  <ConvitesCadastro />
                </ProtectedRoute>
              } />
              <Route path="/convites-cadastro/:id" element={
                <ProtectedRoute permModule="convites">
                  <ConviteDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/onboarding" element={
                <ProtectedRoute permModule="convites">
                  <Onboarding />
                </ProtectedRoute>
              } />
              <Route path="/onboarding/:id" element={
                <ProtectedRoute permModule="convites">
                  <OnboardingDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/recrutamento" element={
                <ProtectedRoute permModule="recrutamento">
                  <Recrutamento />
                </ProtectedRoute>
              } />
              <Route path="/recrutamento/:id" element={
                <ProtectedRoute permModule="recrutamento">
                  <RecrutamentoDetalhe />
                </ProtectedRoute>
              } />
              <Route path="/avaliacoes" element={
                <ProtectedRoute permModule="avaliacoes">
                  <PlaceholderPage title="Avaliações de Desempenho" description="Ciclos de avaliação e PDI" />
                </ProtectedRoute>
              } />
              <Route path="/treinamentos" element={
                <ProtectedRoute permModule="treinamentos">
                  <PlaceholderPage title="Treinamentos" description="Controle de capacitação e certificados" />
                </ProtectedRoute>
              } />
              <Route path="/relatorios" element={
                <ProtectedRoute permModule="relatorios">
                  <PlaceholderPage title="Relatórios e BI" description="Relatórios gerenciais e exportação" />
                </ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/parametros" element={
                <ProtectedRoute permModule="parametros">
                  <Parametros />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute permModule="usuarios">
                  <PlaceholderPage title="Configurações" description="Parâmetros do sistema e permissões" />
                </ProtectedRoute>
              } />
              <Route path="/configurar-perfis" element={
                <ProtectedRoute permModule="usuarios">
                  <ConfigurarPerfis />
                </ProtectedRoute>
              } />
              <Route path="/cargos" element={
                <ProtectedRoute permModule="parametros">
                  <Cargos />
                </ProtectedRoute>
              } />
              <Route path="/cargos/enriquecimento" element={
                <ProtectedRoute permModule="parametros">
                  <CargosEnriquecimento />
                </ProtectedRoute>
              } />
              <Route path="/cargos/novo" element={
                <ProtectedRoute permModule="parametros">
                  <CargoForm />
                </ProtectedRoute>
              } />
              <Route path="/cargos/:id" element={
                <ProtectedRoute permModule="parametros">
                  <CargoForm />
                </ProtectedRoute>
              } />
              <Route path="/admin/reportes" element={
                <ProtectedRoute allowedRoles={["super_admin", "admin_rh"]}>
                  <SistemaReportes />
                </ProtectedRoute>
              } />
              </Route>

            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
