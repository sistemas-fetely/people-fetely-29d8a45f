// ============================================================
// MÓDULO CONTRATOS — Tipos TypeScript
// src/types/contratos.ts
// ============================================================

export type ContratoArea = "financeiro" | "ti" | "juridico" | "outro";

export type ContratoStatus =
  | "ativo"
  | "encerrado"
  | "suspenso"
  | "renovando"
  | "rascunho";

export type FaseTipo =
  | "unico"
  | "recorrente_com_fim"
  | "recorrente_sem_fim";

export type FaseStatus = "ativa" | "encerrada" | "futura";

export type ParcelaStatus = "pendente" | "paga" | "atrasada" | "cancelada";

export type AlertaVencimento = "sem_fim" | "vencido" | "critico" | "atencao" | "ok";

// ============================================================
// Contrato
// ============================================================
export interface Contrato {
  id: string;
  numero: string;
  objeto: string;
  parceiro_id: string | null;
  responsavel_id: string | null;
  area: ContratoArea;
  status: ContratoStatus;
  data_inicio: string;
  data_fim: string | null;
  renova_automaticamente: boolean;
  alerta_renovacao_dias: number;
  doc_storage_path: string | null;
  doc_pendente: boolean;
  clausulas_extraidas: Record<string, unknown> | null;
  resumo_ia: string | null;
  criado_por: string | null;
  created_at: string;
  updated_at: string;
}

// ============================================================
// Fase do contrato
// ============================================================
export interface ContratoFase {
  id: string;
  contrato_id: string;
  nome: string;
  ordem: number;
  tipo: FaseTipo;
  valor: number;
  data_inicio: string;
  data_fim: string | null;
  dia_vencimento: number;
  avanco_automatico: boolean;
  conta_id: string | null;
  centro_custo_id: string | null;
  status: FaseStatus;
  created_at: string;
}

// ============================================================
// Parcela gerada
// ============================================================
export interface ContratoParcela {
  id: string;
  contrato_id: string;
  fase_id: string;
  numero_parcela: number | null;
  total_parcelas: number | null;
  valor: number;
  data_vencimento: string;
  conta_pagar_id: string | null;
  status: ParcelaStatus;
  created_at: string;
}

// ============================================================
// View com KPIs
// ============================================================
export interface ContratoComKPIs extends Contrato {
  parceiro_nome: string | null;
  total_fases: number;
  total_parcelas: number;
  parcelas_pendentes: number;
  parcelas_atrasadas: number;
  valor_mensal_recorrente: number;
  alerta_vencimento: AlertaVencimento;
}

// ============================================================
// Formulário de cadastro
// ============================================================
export interface ContratoFormData {
  numero: string;
  objeto: string;
  parceiro_id: string | null;
  responsavel_id: string | null;
  area: ContratoArea;
  data_inicio: string;
  data_fim: string | null;
  renova_automaticamente: boolean;
  alerta_renovacao_dias: number;
  fases: ContratoFaseFormData[];
}

export interface ContratoFaseFormData {
  nome: string;
  ordem: number;
  tipo: FaseTipo;
  valor: number;
  data_inicio: string;
  data_fim: string | null;
  dia_vencimento: number;
  conta_id: string | null;
}

// ============================================================
// Validação de vínculo boleto/NF com contrato
// ============================================================
export type VinculoStatus =
  | "exato"
  | "soma_fases"
  | "divergencia_pequena"
  | "divergencia_grande"
  | "sem_contrato";

export interface VinculoContratoResult {
  status: VinculoStatus;
  parcela: ContratoParcela | null;
  contrato: Contrato | null;
  fase: ContratoFase | null;
  valor_esperado: number | null;
  valor_recebido: number;
  percentual_divergencia: number | null;
  mensagem: string;
}

// ============================================================
// KPIs da tela
// ============================================================
export interface ContratosKPIs {
  total_ativos: number;
  valor_comprometido_mes: number;
  valor_comprometido_ano: number;
  vencendo_60_dias: number;
  sem_documento: number;
  parcelas_atrasadas: number;
  taxa_boletos_vinculados: number;
  divergencias_pendentes: number;
}

// ============================================================
// Alertas sistêmicos
// ============================================================
export type AlertaTipo =
  | "contrato_vencendo_60d"
  | "contrato_vencendo_30d"
  | "fase_encerrando_15d"
  | "reajuste_30d"
  | "renovacao_automatica_60d"
  | "contrato_vencido"
  | "doc_pendente_7d"
  | "divergencia_valor"
  | "boleto_avulso_excecao";

export interface ContratoAlerta {
  tipo: AlertaTipo;
  contrato_id: string;
  contrato_numero: string;
  mensagem: string;
  urgencia: "info" | "atencao" | "critico";
  para: ("financeiro" | "responsavel" | "juridico" | "admin")[];
}
