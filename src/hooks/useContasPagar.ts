import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Tipos
export type ContaPagarStatus =
  | "rascunho"
  | "pendente"
  | "aprovado"
  | "pago"
  | "finalizado"
  | "cancelado";

export interface ContaPagar {
  id: string;
  parceiro_id?: string | null;
  fornecedor: string;
  descricao: string;
  valor: number;
  data_emissao?: string | null;
  vencimento: string;
  parcelas?: number | null;
  categoria_id?: string | null;
  centro_custo?: string | null;
  unidade?: string | null;
  forma_pagamento?: string | null;
  observacoes?: string | null;
  status: ContaPagarStatus;
  nf_numero?: string | null;
  nf_serie?: string | null;
  nf_chave?: string | null;
  nf_path?: string | null;
  nf_nome?: string | null;
  nf_uploaded_at?: string | null;
  data_pagamento?: string | null;
  valor_pago?: number | null;
  comprovante_path?: string | null;
  comprovante_nome?: string | null;
  created_at: string;
  updated_at: string;
  created_by?: string | null;
  updated_by?: string | null;
  deleted_at?: string | null;
}

export interface ContaPagarHistorico {
  id: string;
  conta_id: string;
  status_anterior?: string | null;
  status_novo: string;
  observacao?: string | null;
  created_at: string;
  created_by?: string | null;
}

export interface ContaPagarFormData {
  parceiro_id?: string | null;
  fornecedor: string;
  descricao: string;
  valor: number;
  data_emissao?: string | null;
  vencimento: string;
  parcelas?: number | null;
  categoria_id?: string | null;
  centro_custo?: string | null;
  unidade?: string | null;
  forma_pagamento?: string | null;
  nf_numero?: string | null;
  nf_serie?: string | null;
  nf_chave?: string | null;
  nf_arquivo?: File | null;
  observacoes?: string | null;
}

export const STATUS_LABELS: Record<ContaPagarStatus, string> = {
  rascunho: "Rascunho",
  pendente: "Pendente",
  aprovado: "Aprovado",
  pago: "Pago",
  finalizado: "Finalizado",
  cancelado: "Cancelado",
};

export const STATUS_COLORS: Record<ContaPagarStatus, string> = {
  rascunho: "bg-gray-100 text-gray-800",
  pendente: "bg-yellow-100 text-yellow-800",
  aprovado: "bg-green-100 text-green-800",
  pago: "bg-blue-100 text-blue-800",
  finalizado: "bg-emerald-100 text-emerald-800",
  cancelado: "bg-red-100 text-red-800",
};

export const TRANSICOES_PERMITIDAS: Record<ContaPagarStatus, ContaPagarStatus[]> = {
  rascunho: ["pendente", "cancelado"],
  pendente: ["aprovado", "rascunho", "cancelado"],
  aprovado: ["pago", "pendente", "cancelado"],
  pago: ["finalizado", "cancelado"],
  finalizado: [],
  cancelado: [],
};

// TODO: migrar para dimensão administrável em Parâmetros > Financeiro
export const CENTROS_CUSTO = [
  { value: "comercial", label: "Comercial" },
  { value: "administrativo", label: "Administrativo" },
  { value: "rh", label: "RH" },
  { value: "ti", label: "TI" },
  { value: "fiscal", label: "Fiscal" },
  { value: "financeiro", label: "Financeiro" },
  { value: "fabrica", label: "Fábrica" },
  { value: "geral", label: "Geral" },
] as const;

export interface UnidadeOption {
  id: string;
  nome: string;
  codigo: string | null;
  tipo: string | null;
}

// Hook: lista de unidades ativas (dimensão administrável)
export function useUnidades() {
  return useQuery({
    queryKey: ["unidades-ativas"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("unidades")
        .select("id, nome, codigo, tipo")
        .eq("ativa", true)
        .order("nome");
      if (error) throw error;
      return (data ?? []) as UnidadeOption[];
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

export interface FornecedorOption {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string | null;
  categoria_padrao_id: string | null;
  centro_custo_padrao: string | null;
}

// Hook: lista de fornecedores ativos para o combobox
export function useFornecedores() {
  return useQuery({
    queryKey: ["parceiros-fornecedores"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social, nome_fantasia, cnpj, categoria_padrao_id, centro_custo_padrao")
        .eq("ativo", true)
        .contains("tipos", ["fornecedor"])
        .order("razao_social", { ascending: true });
      if (error) throw error;
      return (data ?? []) as FornecedorOption[];
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

// Hook principal - listar contas (join com parceiro e categoria)
export interface ContaPagarComRelacionados extends ContaPagar {
  parceiro?: { id: string; razao_social: string; nome_fantasia: string | null } | null;
  categoria?: { id: string; codigo: string; nome: string } | null;
}

export function useContasPagar(filtroStatus?: ContaPagarStatus) {
  return useQuery({
    queryKey: ["contas_pagar", filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from("contas_pagar")
        .select(
          `*,
           parceiro:parceiros_comerciais!contas_pagar_parceiro_id_fkey(id, razao_social, nome_fantasia),
           categoria:plano_contas!contas_pagar_categoria_id_fkey(id, codigo, nome)`,
        )
        .is("deleted_at", null)
        .order("vencimento", { ascending: true });

      if (filtroStatus) {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      if (error) {
        // Fallback caso o nome do FK não bata
        const { data: simple, error: e2 } = await supabase
          .from("contas_pagar")
          .select("*")
          .is("deleted_at", null)
          .order("vencimento", { ascending: true });
        if (e2) throw e2;
        return (simple ?? []) as unknown as ContaPagarComRelacionados[];
      }
      return (data ?? []) as unknown as ContaPagarComRelacionados[];
    },
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

// Hook para buscar histórico de uma conta
export function useContaHistorico(contaId: string | null) {
  return useQuery({
    queryKey: ["conta_historico", contaId],
    queryFn: async () => {
      if (!contaId) return [] as ContaPagarHistorico[];

      const { data, error } = await supabase
        .from("contas_pagar_historico")
        .select("*")
        .eq("conta_id", contaId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return (data ?? []) as unknown as ContaPagarHistorico[];
    },
    enabled: !!contaId,
    staleTime: 300_000,
    refetchOnWindowFocus: false,
  });
}

// Helper: upload da NF para storage
async function uploadNF(contaId: string, arquivo: File) {
  const fileExt = arquivo.name.split(".").pop();
  const fileName = `${contaId}_${Date.now()}.${fileExt}`;
  const filePath = `contas-pagar/${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from("documentos")
    .upload(filePath, arquivo);

  if (uploadError) throw uploadError;

  return { filePath, fileName: arquivo.name };
}

// Mutation: Criar conta
export function useCriarConta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: ContaPagarFormData) => {
      const { data: userData } = await supabase.auth.getUser();
      const { nf_arquivo, ...rest } = dados;

      const { data, error } = await supabase
        .from("contas_pagar")
        .insert({
          parceiro_id: rest.parceiro_id || null,
          fornecedor: rest.fornecedor,
          descricao: rest.descricao,
          valor: rest.valor,
          data_emissao: rest.data_emissao || null,
          vencimento: rest.vencimento,
          parcelas: rest.parcelas ?? 1,
          categoria_id: rest.categoria_id || null,
          centro_custo: rest.centro_custo || null,
          unidade: rest.unidade || null,
          forma_pagamento: rest.forma_pagamento || null,
          nf_numero: rest.nf_numero || null,
          nf_serie: rest.nf_serie || null,
          nf_chave: rest.nf_chave || null,
          observacoes: rest.observacoes || null,
          status: "rascunho",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Upload NF se enviado
      if (nf_arquivo && data?.id) {
        try {
          const { filePath, fileName } = await uploadNF(data.id, nf_arquivo);
          await supabase
            .from("contas_pagar")
            .update({
              nf_path: filePath,
              nf_nome: fileName,
              nf_uploaded_at: new Date().toISOString(),
            })
            .eq("id", data.id);
        } catch (e: any) {
          toast.error("Conta criada, mas falhou upload da NF", {
            description: e?.message,
          });
        }
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast.success("Conta criada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao criar conta", { description: error.message });
    },
  });
}

// Mutation: Editar conta
export function useEditarConta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contaId,
      dados,
    }: {
      contaId: string;
      dados: ContaPagarFormData;
    }) => {
      const { data: userData } = await supabase.auth.getUser();
      const { nf_arquivo, ...rest } = dados;

      const { error } = await supabase
        .from("contas_pagar")
        .update({
          parceiro_id: rest.parceiro_id || null,
          fornecedor: rest.fornecedor,
          descricao: rest.descricao,
          valor: rest.valor,
          data_emissao: rest.data_emissao || null,
          vencimento: rest.vencimento,
          parcelas: rest.parcelas ?? 1,
          categoria_id: rest.categoria_id || null,
          centro_custo: rest.centro_custo || null,
          unidade: rest.unidade || null,
          forma_pagamento: rest.forma_pagamento || null,
          nf_numero: rest.nf_numero || null,
          nf_serie: rest.nf_serie || null,
          nf_chave: rest.nf_chave || null,
          observacoes: rest.observacoes || null,
          updated_by: userData.user?.id,
        })
        .eq("id", contaId);

      if (error) throw error;

      // Upload NF se um novo arquivo foi enviado
      if (nf_arquivo) {
        try {
          const { filePath, fileName } = await uploadNF(contaId, nf_arquivo);
          await supabase
            .from("contas_pagar")
            .update({
              nf_path: filePath,
              nf_nome: fileName,
              nf_uploaded_at: new Date().toISOString(),
            })
            .eq("id", contaId);
        } catch (e: any) {
          toast.error("Conta editada, mas falhou upload da NF", {
            description: e?.message,
          });
        }
      }

      return contaId;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast.success("Conta atualizada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao editar conta", { description: error.message });
    },
  });
}

// Mutation: Atualizar status
export function useAtualizarStatus() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      contaId,
      novoStatus,
    }: {
      contaId: string;
      novoStatus: ContaPagarStatus;
    }) => {
      const { error } = await supabase
        .from("contas_pagar")
        .update({ status: novoStatus })
        .eq("id", contaId);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      queryClient.invalidateQueries({ queryKey: ["conta_historico", variables.contaId] });
      toast.success(`Status atualizado para: ${STATUS_LABELS[variables.novoStatus]}`);
    },
    onError: (error: any) => {
      toast.error("Erro ao atualizar status", { description: error.message });
    },
  });
}

// Mutation: Anexar NF
export function useAnexarNF() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ contaId, arquivo }: { contaId: string; arquivo: File }) => {
      const { filePath, fileName } = await uploadNF(contaId, arquivo);

      const { error: updateError } = await supabase
        .from("contas_pagar")
        .update({
          nf_path: filePath,
          nf_nome: fileName,
          nf_uploaded_at: new Date().toISOString(),
        })
        .eq("id", contaId);

      if (updateError) throw updateError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast.success("NF anexada com sucesso!");
    },
    onError: (error: any) => {
      toast.error("Erro ao anexar NF", { description: error.message });
    },
  });
}

// Mutation: Excluir (soft delete)
export function useExcluirConta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (contaId: string) => {
      const { error } = await supabase
        .from("contas_pagar")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", contaId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contas_pagar"] });
      toast.success("Conta excluída!");
    },
    onError: (error: any) => {
      toast.error("Erro ao excluir conta", { description: error.message });
    },
  });
}
