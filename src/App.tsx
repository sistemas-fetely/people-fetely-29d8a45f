import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
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
import Recrutamento from "@/pages/Recrutamento";
import RecrutamentoDetalhe from "@/pages/RecrutamentoDetalhe";

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
            <Route path="/unsubscribe" element={<Unsubscribe />} />

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
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
              <Route path="/recrutamento" element={
                <ProtectedRoute permModule="recrutamento">
                  <Recrutamento />
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
              <Route path="/gerenciar-usuarios" element={
                <ProtectedRoute permModule="usuarios">
                  <GerenciarUsuarios />
                </ProtectedRoute>
              } />
              <Route path="/configurar-perfis" element={
                <ProtectedRoute permModule="usuarios">
                  <ConfigurarPerfis />
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
