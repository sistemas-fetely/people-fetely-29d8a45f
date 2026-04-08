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
import ColaboradorDetalhe from "@/pages/ColaboradorDetalhe";
import { CadastroColaboradorCLTWrapper } from "@/components/colaborador-clt/CadastroColaboradorCLT";
import PlaceholderPage from "@/pages/PlaceholderPage";
import Login from "@/pages/Login";
import RecuperarSenha from "@/pages/RecuperarSenha";
import ResetPassword from "@/pages/ResetPassword";
import SemPermissao from "@/pages/SemPermissao";
import NotFound from "@/pages/NotFound";
import Parametros from "@/pages/Parametros";

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

            {/* Protected routes */}
            <Route element={<ProtectedRoute><AppLayout /></ProtectedRoute>}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/colaboradores" element={<Colaboradores />} />
              <Route path="/colaboradores/novo" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh"]}>
                  <CadastroColaboradorCLTWrapper />
                </ProtectedRoute>
              } />
              <Route path="/colaboradores/:id" element={<ColaboradorDetalhe />} />
              <Route path="/organograma" element={<PlaceholderPage title="Organograma" description="Visualização hierárquica da empresa" />} />

              {/* CLT - Gestor RH, Super Admin, Financeiro */}
              <Route path="/folha-pagamento" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh", "financeiro"]}>
                  <PlaceholderPage title="Folha de Pagamento" description="Gestão da folha de pagamento CLT" />
                </ProtectedRoute>
              } />
              <Route path="/ferias" element={<PlaceholderPage title="Férias" description="Controle de férias e períodos aquisitivos" />} />
              <Route path="/ponto" element={<PlaceholderPage title="Controle de Ponto" description="Apuração de horas e banco de horas" />} />
              <Route path="/beneficios" element={<PlaceholderPage title="Benefícios" description="Gestão de benefícios CLT" />} />

              {/* PJ */}
              <Route path="/contratos-pj" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh", "financeiro"]}>
                  <PlaceholderPage title="Contratos PJ" description="Gestão de contratos de prestadores" />
                </ProtectedRoute>
              } />
              <Route path="/notas-fiscais" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh", "financeiro"]}>
                  <PlaceholderPage title="Notas Fiscais" description="Workflow de aprovação e upload de NFs" />
                </ProtectedRoute>
              } />
              <Route path="/pagamentos-pj" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh", "financeiro"]}>
                  <PlaceholderPage title="Pagamentos PJ" description="Controle de pagamentos a prestadores" />
                </ProtectedRoute>
              } />

              {/* RH */}
              <Route path="/recrutamento" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh"]}>
                  <PlaceholderPage title="Recrutamento e Seleção" description="Kanban de vagas e candidatos" />
                </ProtectedRoute>
              } />
              <Route path="/avaliacoes" element={<PlaceholderPage title="Avaliações de Desempenho" description="Ciclos de avaliação e PDI" />} />
              <Route path="/treinamentos" element={<PlaceholderPage title="Treinamentos" description="Controle de capacitação e certificados" />} />
              <Route path="/relatorios" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh", "financeiro"]}>
                  <PlaceholderPage title="Relatórios e BI" description="Relatórios gerenciais e exportação" />
                </ProtectedRoute>
              } />

              {/* Admin */}
              <Route path="/parametros" element={
                <ProtectedRoute allowedRoles={["super_admin", "gestor_rh"]}>
                  <Parametros />
                </ProtectedRoute>
              } />
              <Route path="/configuracoes" element={
                <ProtectedRoute allowedRoles={["super_admin"]}>
                  <PlaceholderPage title="Configurações" description="Parâmetros do sistema e permissões" />
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
