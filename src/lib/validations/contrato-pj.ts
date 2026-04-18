import { z } from "zod";
import {
  dadosBancariosSchema,
  dependenteSchema,
  acessoSistemaSchema,
  equipamentoSchema,
  departamentoRateioSchema,
} from "./colaborador-clt";

export { type DadosBancariosForm } from "./colaborador-clt";

// Step 1: Dados Pessoais + Dados da Empresa
export const dadosPessoaisPJSchema = z.object({
  // Dados da pessoa de contato / prestador
  contato_nome: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  contato_telefone: z.string().optional().or(z.literal("")),
  contato_email: z.string().email("Email inválido").optional().or(z.literal("")),
  // Dados pessoais do prestador
  cpf: z.string().optional().or(z.literal("")),
  rg: z.string().optional().or(z.literal("")),
  orgao_emissor: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().optional().or(z.literal("")),
  genero: z.string().optional().or(z.literal("")),
  estado_civil: z.string().optional().or(z.literal("")),
  nacionalidade: z.string().default("Brasileira"),
  etnia: z.string().optional().or(z.literal("")),
  nome_mae: z.string().optional().or(z.literal("")),
  nome_pai: z.string().optional().or(z.literal("")),
  // Endereço
  cep: z.string().optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  uf: z.string().optional().or(z.literal("")),
  // Contato
  telefone: z.string().optional().or(z.literal("")),
  email_pessoal: z.string().email("Email inválido").optional().or(z.literal("")),
  contato_emergencia_nome: z.string().optional().or(z.literal("")),
  foto_url: z.string().optional().or(z.literal("")),
  contato_emergencia_telefone: z.string().optional().or(z.literal("")),
  // Dados da empresa
  cnpj: z.string().min(14, "CNPJ é obrigatório"),
  razao_social: z.string().min(2, "Razão Social é obrigatória"),
  nome_fantasia: z.string().optional().or(z.literal("")),
  inscricao_municipal: z.string().optional().or(z.literal("")),
  inscricao_estadual: z.string().optional().or(z.literal("")),
});

// Step 2: Documentos (sem CLT-specific, com contrato_assinado)
export const documentosPJSchema = z.object({
  contrato_assinado: z.boolean().default(false),
  objeto: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
  // CNH (mantém do CLT)
  titulo_eleitor: z.string().optional().or(z.literal("")),
  zona_eleitoral: z.string().optional().or(z.literal("")),
  secao_eleitoral: z.string().optional().or(z.literal("")),
  cnh_numero: z.string().optional().or(z.literal("")),
  cnh_categoria: z.string().optional().or(z.literal("")),
  cnh_validade: z.string().optional().or(z.literal("")),
  certificado_reservista: z.string().optional().or(z.literal("")),
});

// Step 3: Dados Profissionais (adaptado PJ)
export const dadosProfissionaisPJSchema = z.object({
  tipo_servico: z.string().min(2, "Cargo é obrigatório"),
  cargo_id: z.string().nullable().optional(),
  departamento: z.string().min(1, "Departamento é obrigatório"),
  departamento_id: z.string().nullable().optional(),
  unidade_id: z.string().uuid({ message: "Unidade é obrigatória" }),
  data_inicio: z.string().min(1, "Data de início é obrigatória"),
  data_fim: z.string().optional().or(z.literal("")),
  valor_mensal: z.coerce.number().positive("Valor mensal deve ser positivo"),
  forma_pagamento: z.string().default("transferencia"),
  dia_vencimento: z.coerce.number().min(1).max(31).default(10),
  renovacao_automatica: z.boolean().default(false),
  status: z.string().default("rascunho"),
  gestor_direto_id: z.string().optional().or(z.literal("")),
});

// Step 4: Dados Bancários (reusa do CLT)
export const dadosBancariosPJSchema = dadosBancariosSchema;

// Step 5: Empresa (reusa do CLT)
export const dadosEmpresaPJSchema = z.object({
  email_corporativo: z.string().email("Email inválido").optional().or(z.literal("")),
  ramal: z.string().optional().or(z.literal("")),
  data_integracao: z.string().optional().or(z.literal("")),
  acessos_sistemas: z.array(acessoSistemaSchema).default([]),
  equipamentos: z.array(equipamentoSchema).default([]),
});

// Step 6: Dependentes (reusa do CLT)
export const dependentesPJSchema = z.object({
  dependentes: z.array(dependenteSchema).default([]),
});

export type DadosPessoaisPJForm = z.infer<typeof dadosPessoaisPJSchema>;
export type DocumentosPJForm = z.infer<typeof documentosPJSchema>;
export type DadosProfissionaisPJForm = z.infer<typeof dadosProfissionaisPJSchema>;
export type DadosEmpresaPJForm = z.infer<typeof dadosEmpresaPJSchema>;
export type DependentesPJForm = z.infer<typeof dependentesPJSchema>;

export type AllPJFormData = DadosPessoaisPJForm &
  DocumentosPJForm &
  DadosProfissionaisPJForm &
  z.infer<typeof dadosBancariosPJSchema> &
  DadosEmpresaPJForm &
  DependentesPJForm;
