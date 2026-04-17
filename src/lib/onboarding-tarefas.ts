import type { Database } from "@/integrations/supabase/types";

type AppRole = Database["public"]["Enums"]["app_role"];

interface TarefaTemplate {
  titulo: string;
  descricao?: string;
  responsavel_role: AppRole;
  prazo_dias: number;
  somente_clt?: boolean;
  sistema_origem?: string;
  area_destino?: string;
  prioridade?: string;
  link_acao?: string;
}

export const TAREFAS_PADRAO: TarefaTemplate[] = [
  {
    titulo: "Registrar admissão no eSocial",
    descricao: "Incluir o registro de admissão no sistema eSocial antes do primeiro dia de trabalho.",
    responsavel_role: "admin_rh",
    prazo_dias: -1,
    somente_clt: true,
    sistema_origem: "people",
    area_destino: "RH",
  },
  {
    titulo: "Criar acessos nos sistemas",
    descricao: "Provisionar acessos a todos os sistemas corporativos necessários.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
    sistema_origem: "ti",
    area_destino: "TI",
  },
  {
    titulo: "Entregar equipamentos",
    descricao: "Preparar e entregar notebook, monitor e demais equipamentos definidos.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
    sistema_origem: "ti",
    area_destino: "TI",
  },
  {
    titulo: "Agendar reunião de integração com RH",
    descricao: "Agenda de boas-vindas, cultura, benefícios e políticas internas.",
    responsavel_role: "gestor_rh",
    prazo_dias: 1,
    sistema_origem: "people",
    area_destino: "RH",
  },
  {
    titulo: "Entregar crachá e uniforme (se aplicável)",
    descricao: "Providenciar crachá de acesso e uniformes quando necessário.",
    responsavel_role: "admin_rh",
    prazo_dias: 1,
    somente_clt: true,
    sistema_origem: "people",
    area_destino: "RH",
  },
  {
    titulo: "Apresentar colaborador ao time",
    descricao: "Apresentação formal ao time e tour pelo escritório/ambiente de trabalho.",
    responsavel_role: "gestor_direto",
    prazo_dias: 1,
    sistema_origem: "people",
    area_destino: "Gestão",
  },
  {
    titulo: "Assinar contrato (digital ou físico)",
    descricao: "Assinatura do contrato de trabalho e documentos complementares.",
    responsavel_role: "colaborador",
    prazo_dias: 1,
    sistema_origem: "people",
    area_destino: "RH",
  },
  {
    titulo: "Confirmar recebimento de equipamentos",
    descricao: "Confirmar que todos os equipamentos foram recebidos e estão funcionando.",
    responsavel_role: "colaborador",
    prazo_dias: 3,
    sistema_origem: "people",
    area_destino: "Colaborador",
  },
  {
    titulo: "Realizar reunião 1:1 de onboarding",
    descricao: "Primeira reunião individual com gestor direto para alinhamento de expectativas.",
    responsavel_role: "gestor_direto",
    prazo_dias: 7,
    sistema_origem: "people",
    area_destino: "Gestão",
  },
];

export function getTarefasParaTipo(tipo: "clt" | "pj"): TarefaTemplate[] {
  return TAREFAS_PADRAO.filter((t) => !t.somente_clt || tipo === "clt");
}

interface ProvisionamentoData {
  email_corporativo?: boolean;
  email_corporativo_formato?: string;
  celular_corporativo?: boolean;
  sistemas_ids?: string[];
  equipamentos?: { tipo: string; quantidade: number }[];
}

export function getTarefasDinamicas(tipo: "clt" | "pj", provisionamento?: ProvisionamentoData): TarefaTemplate[] {
  const tarefas: TarefaTemplate[] = [];

  // Tarefas padrão filtradas por tipo
  tarefas.push(...getTarefasParaTipo(tipo));

  if (!provisionamento) return tarefas;

  // Email corporativo
  if (provisionamento.email_corporativo) {
    tarefas.push({
      titulo: `Criar e-mail corporativo${provisionamento.email_corporativo_formato ? `: ${provisionamento.email_corporativo_formato}` : ""}`,
      descricao: "Criar conta de e-mail corporativo no Google Workspace ou provedor da empresa.",
      responsavel_role: "admin_rh",
      prazo_dias: -2,
      sistema_origem: "ti",
      area_destino: "TI",
    });
  }

  // Celular corporativo
  if (provisionamento.celular_corporativo) {
    tarefas.push({
      titulo: "Providenciar celular corporativo (aparelho + linha)",
      descricao: "Solicitar aparelho e ativar linha telefônica corporativa.",
      responsavel_role: "admin_rh",
      prazo_dias: -2,
      sistema_origem: "ti",
      area_destino: "TI",
    });
  }

  // Sistemas — uma tarefa por sistema
  if (provisionamento.sistemas_ids && provisionamento.sistemas_ids.length > 0) {
    const idxGenerico = tarefas.findIndex(t => t.titulo === "Criar acessos nos sistemas");
    if (idxGenerico !== -1) tarefas.splice(idxGenerico, 1);

    for (const sistema of provisionamento.sistemas_ids) {
      tarefas.push({
        titulo: `Cadastrar acesso: ${sistema}`,
        descricao: `Criar usuário e configurar permissões no sistema ${sistema}.`,
        responsavel_role: "admin_rh",
        prazo_dias: -1,
        sistema_origem: "ti",
        area_destino: "TI",
      });
    }
  }

  // Equipamentos — uma tarefa por tipo de equipamento
  if (provisionamento.equipamentos && provisionamento.equipamentos.length > 0) {
    const idxGenerico = tarefas.findIndex(t => t.titulo === "Entregar equipamentos");
    if (idxGenerico !== -1) tarefas.splice(idxGenerico, 1);

    for (const eq of provisionamento.equipamentos) {
      const qtd = eq.quantidade > 1 ? ` (${eq.quantidade}x)` : "";
      tarefas.push({
        titulo: `Preparar e entregar: ${eq.tipo}${qtd}`,
        descricao: `Separar, configurar e preparar ${eq.tipo} para entrega no primeiro dia.`,
        responsavel_role: "admin_rh",
        prazo_dias: -2,
        sistema_origem: "ti",
        area_destino: "TI",
      });
    }
  }

  // Ordenar por prazo_dias (tarefas antes do D-day primeiro)
  tarefas.sort((a, b) => a.prazo_dias - b.prazo_dias);

  return tarefas;
}
