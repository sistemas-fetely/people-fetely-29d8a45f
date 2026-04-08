import { z } from "zod";

const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/;
const cepRegex = /^\d{5}-?\d{3}$/;
const phoneRegex = /^\(?\d{2}\)?\s?\d{4,5}-?\d{4}$/;

export const dadosPessoaisSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres").max(200),
  cpf: z.string().regex(cpfRegex, "CPF inválido (formato: 000.000.000-00)"),
  rg: z.string().optional().or(z.literal("")),
  orgao_emissor: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  genero: z.string().optional().or(z.literal("")),
  estado_civil: z.string().optional().or(z.literal("")),
  nacionalidade: z.string().default("Brasileira"),
  etnia: z.string().optional().or(z.literal("")),
  nome_mae: z.string().optional().or(z.literal("")),
  nome_pai: z.string().optional().or(z.literal("")),
  cep: z.string().regex(cepRegex, "CEP inválido").optional().or(z.literal("")),
  logradouro: z.string().optional().or(z.literal("")),
  numero: z.string().optional().or(z.literal("")),
  complemento: z.string().optional().or(z.literal("")),
  bairro: z.string().optional().or(z.literal("")),
  cidade: z.string().optional().or(z.literal("")),
  uf: z.string().optional().or(z.literal("")),
  telefone: z.string().optional().or(z.literal("")),
  email_pessoal: z.string().email("Email inválido").optional().or(z.literal("")),
  contato_emergencia_nome: z.string().optional().or(z.literal("")),
  contato_emergencia_telefone: z.string().optional().or(z.literal("")),
});

export const documentosSchema = z.object({
  pis_pasep: z.string().optional().or(z.literal("")),
  ctps_numero: z.string().optional().or(z.literal("")),
  ctps_serie: z.string().optional().or(z.literal("")),
  ctps_uf: z.string().optional().or(z.literal("")),
  titulo_eleitor: z.string().optional().or(z.literal("")),
  zona_eleitoral: z.string().optional().or(z.literal("")),
  secao_eleitoral: z.string().optional().or(z.literal("")),
  cnh_numero: z.string().optional().or(z.literal("")),
  cnh_categoria: z.string().optional().or(z.literal("")),
  cnh_validade: z.string().optional().or(z.literal("")),
  certificado_reservista: z.string().optional().or(z.literal("")),
});

export const departamentoRateioSchema = z.object({
  departamento: z.string().min(1, "Departamento é obrigatório"),
  percentual_rateio: z.coerce.number().min(0.01, "Percentual deve ser maior que 0").max(100, "Máximo 100%"),
});

export const dadosProfissionaisSchema = z.object({
  matricula: z.string().optional().or(z.literal("")),
  cargo: z.string().min(2, "Cargo é obrigatório"),
  departamento: z.string().min(1, "Departamento é obrigatório"),
  data_admissao: z.string().min(1, "Data de admissão é obrigatória"),
  tipo_contrato: z.string().default("indeterminado"),
  salario_base: z.coerce.number().positive("Salário deve ser positivo"),
  jornada_semanal: z.coerce.number().min(1).max(44).default(44),
  horario_trabalho: z.string().optional().or(z.literal("")),
  local_trabalho: z.string().optional().or(z.literal("")),
});

export const dadosBancariosSchema = z.object({
  banco_nome: z.string().optional().or(z.literal("")),
  banco_codigo: z.string().optional().or(z.literal("")),
  agencia: z.string().optional().or(z.literal("")),
  conta: z.string().optional().or(z.literal("")),
  tipo_conta: z.string().default("corrente"),
  chave_pix: z.string().optional().or(z.literal("")),
});

export const dependenteSchema = z.object({
  nome_completo: z.string().min(3, "Nome deve ter pelo menos 3 caracteres"),
  cpf: z.string().optional().or(z.literal("")),
  data_nascimento: z.string().min(1, "Data de nascimento é obrigatória"),
  parentesco: z.string().min(1, "Parentesco é obrigatório"),
  incluir_irrf: z.boolean().default(false),
  incluir_plano_saude: z.boolean().default(false),
});

export const dependentesSchema = z.object({
  dependentes: z.array(dependenteSchema).default([]),
});

export const acessoSistemaSchema = z.object({
  sistema: z.string().min(1),
  tem_acesso: z.boolean().default(false),
  usuario: z.string().optional().or(z.literal("")),
  observacoes: z.string().optional().or(z.literal("")),
});

export const equipamentoSchema = z.object({
  tipo: z.string().min(1, "Tipo do equipamento é obrigatório"),
  marca: z.string().optional().or(z.literal("")),
  modelo: z.string().optional().or(z.literal("")),
  numero_patrimonio: z.string().optional().or(z.literal("")),
  numero_serie: z.string().optional().or(z.literal("")),
  data_entrega: z.string().optional().or(z.literal("")),
  estado: z.string().default("novo"),
  observacoes: z.string().optional().or(z.literal("")),
});

export const dadosEmpresaSchema = z.object({
  email_corporativo: z.string().email("Email corporativo inválido").optional().or(z.literal("")),
  ramal: z.string().optional().or(z.literal("")),
  data_integracao: z.string().optional().or(z.literal("")),
  acessos_sistemas: z.array(acessoSistemaSchema).default([]),
  equipamentos: z.array(equipamentoSchema).default([]),
});

export type DadosPessoaisForm = z.infer<typeof dadosPessoaisSchema>;
export type DocumentosForm = z.infer<typeof documentosSchema>;
export type DadosProfissionaisForm = z.infer<typeof dadosProfissionaisSchema>;
export type DadosBancariosForm = z.infer<typeof dadosBancariosSchema>;
export type DependenteForm = z.infer<typeof dependenteSchema>;
export type DependentesForm = z.infer<typeof dependentesSchema>;
export type AcessoSistemaForm = z.infer<typeof acessoSistemaSchema>;
export type EquipamentoForm = z.infer<typeof equipamentoSchema>;
export type DadosEmpresaForm = z.infer<typeof dadosEmpresaSchema>;
