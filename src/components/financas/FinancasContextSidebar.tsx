import {
  Wallet,
  LayoutDashboard,
  ArrowDownCircle,
  ArrowUpCircle,
  Calendar,
  ArrowLeftRight,
  CreditCard,
  GitCompare,
  CheckCheck,
  Upload,
  FileText,
  FileWarning,
  Users,
  FolderTree,
  Landmark,
  Coins,
  LineChart,
  TrendingUp,
  Target,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { FinancasSidebarItem } from "./FinancasSidebarItem";
import { FinancasSidebarSection } from "./FinancasSidebarSection";

export function FinancasContextSidebar() {
  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <div className="flex items-center gap-2 px-2 py-1.5">
          <Wallet className="h-5 w-5 text-gold flex-shrink-0" />
          <span className="font-serif text-lg text-foreground group-data-[collapsible=icon]:hidden">
            Finanças
          </span>
        </div>
      </SidebarHeader>

      <SidebarContent>
        {/* Item raiz */}
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              <FinancasSidebarItem
                to="/administrativo"
                icon={LayoutDashboard}
                label="Visão Geral"
                end
              />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* OPERAR */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs text-muted-foreground">
            Operar
          </SidebarGroupLabel>
          <SidebarGroupContent className="space-y-2">
            <FinancasSidebarSection title="CPR">
              <FinancasSidebarItem to="/administrativo/contas-pagar" icon={ArrowDownCircle} label="Contas a Pagar" />
              <FinancasSidebarItem to="/administrativo/contas-receber" icon={ArrowUpCircle} label="Contas a Receber" />
              <FinancasSidebarItem to="/administrativo/compromissos" icon={Calendar} label="Compromissos" />
            </FinancasSidebarSection>

            <FinancasSidebarSection title="Banco">
              <FinancasSidebarItem to="/administrativo/caixa-banco" icon={ArrowLeftRight} label="Movimentações" end />
              <FinancasSidebarItem to="/administrativo/faturas-cartao" icon={CreditCard} label="Faturas de Cartão" />
              <FinancasSidebarItem to="/administrativo/reconciliacao-cartao" icon={GitCompare} label="Reconciliação" />
              <FinancasSidebarItem to="/administrativo/conciliacao" icon={CheckCheck} label="Conciliação" />
            </FinancasSidebarSection>

            <FinancasSidebarSection title="Documentos">
              <FinancasSidebarItem to="/administrativo/importar" icon={Upload} label="Importar Dados" />
              <FinancasSidebarItem to="/administrativo/nfs-stage" icon={FileText} label="NFs em Stage" />
              <FinancasSidebarItem to="/administrativo/documentos-pendentes" icon={FileWarning} label="Documentos Pendentes" />
            </FinancasSidebarSection>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ESTRUTURA */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs text-muted-foreground">
            Estrutura
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <FinancasSidebarItem to="/administrativo/parceiros" icon={Users} label="Parceiros Comerciais" />
              <FinancasSidebarItem to="/administrativo/plano-contas" icon={FolderTree} label="Plano de Contas" />
              <FinancasSidebarItem to="/administrativo/caixa-banco/contas" icon={Landmark} label="Contas Bancárias" />
              <FinancasSidebarItem to="/administrativo/investimento-lancamento" icon={Coins} label="Investimento de Lançamento" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* ACOMPANHAR */}
        <SidebarGroup>
          <SidebarGroupLabel className="uppercase tracking-wider text-xs text-muted-foreground">
            Acompanhar
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              <FinancasSidebarItem to="/administrativo/fluxo-caixa" icon={LineChart} label="Fluxo de Caixa" />
              <FinancasSidebarItem to="/administrativo/fluxo-futuro" icon={TrendingUp} label="Fluxo Futuro" />
              <FinancasSidebarItem to="/administrativo/fluxo-futuro-investimento" icon={Target} label="Fluxo Futuro Investimento" />
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
