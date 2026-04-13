import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface TarefaTemplate {
  titulo: string;
  descricao?: string;
  responsavel_role: AppRole;
  prazo_dias: number;
  somente_clt?: boolean;
}

export const TAREFAS_PADRAO: TarefaTemplate[] = [
  {
    titulo: "Registrar admissão no eSocial",
    descricao: "Incluir o registro de admissão no sistema eSocial antes do primeiro dia de trabalho.",
    responsavel_role: "admin_rh",
    prazo_dias: -1,
    somente_clt: true,
  },
  {
    titulo: "Criar acessos nos sistemas",
    descricao: "Provisionar acessos a todos os sistemas corporativos necessários.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
  },
  {
    titulo: "Entregar equipamentos",
    descricao: "Preparar e entregar notebook, monitor e demais equipamentos definidos.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
  },
  {
    titulo: "Agendar reunião de integração com RH",
    descricao: "Agenda de boas-vindas, cultura, benefícios e políticas internas.",
    responsavel_role: "gestor_rh",
    prazo_dias: 1,
  },
  {
    titulo: "Entregar crachá e uniforme (se aplicável)",
    descricao: "Providenciar crachá de acesso e uniformes quando necessário.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
    somente_clt: true,
  },
  {
    titulo: "Apresentar colaborador ao time",
    descricao: "Apresentação formal ao time e tour pelo escritório/ambiente de trabalho.",
    responsavel_role: "gestor_direto",
    prazo_dias: 1,
  },
  {
    titulo: "Assinar contrato (digital ou físico)",
    descricao: "Assinatura do contrato de trabalho e documentos complementares.",
    responsavel_role: "colaborador",
    prazo_dias: 1,
  },
  {
    titulo: "Confirmar recebimento de equipamentos",
    descricao: "Confirmar que todos os equipamentos foram recebidos e estão funcionando.",
    responsavel_role: "colaborador",
    prazo_dias: 3,
  },
  {
    titulo: "Realizar reunião 1:1 de onboarding",
    descricao: "Primeira reunião individual com gestor direto para alinhamento de expectativas.",
    responsavel_role: "gestor_direto",
    prazo_dias: 7,
  },
];

export function getTarefasParaTipo(tipo: "clt" | "pj"): TarefaTemplate[] {
  return TAREFAS_PADRAO.filter((t) => !t.somente_clt || tipo === "clt");
}
