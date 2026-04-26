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
  fornecedor: string;
  descricao: string;
  valor: number;
  vencimento: string;
  categoria_id?: string | null;
  observacoes?: string | null;
  status: ContaPagarStatus;
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
  fornecedor: string;
  descricao: string;
  valor: number;
  vencimento: string;
  categoria_id?: string;
  observacoes?: string;
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

// Hook principal - listar contas
export function useContasPagar(filtroStatus?: ContaPagarStatus) {
  return useQuery({
    queryKey: ["contas_pagar", filtroStatus],
    queryFn: async () => {
      let query = supabase
        .from("contas_pagar")
        .select("*")
        .is("deleted_at", null)
        .order("vencimento", { ascending: true });

      if (filtroStatus) {
        query = query.eq("status", filtroStatus);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as ContaPagar[];
    },
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
  });
}

// Mutation: Criar conta
export function useCriarConta() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (dados: ContaPagarFormData) => {
      const { data: userData } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("contas_pagar")
        .insert({
          ...dados,
          status: "rascunho",
          created_by: userData.user?.id,
        })
        .select()
        .single();

      if (error) throw error;
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
      const fileExt = arquivo.name.split(".").pop();
      const fileName = `${contaId}_${Date.now()}.${fileExt}`;
      const filePath = `contas-pagar/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("documentos")
        .upload(filePath, arquivo);

      if (uploadError) throw uploadError;

      const { error: updateError } = await supabase
        .from("contas_pagar")
        .update({
          nf_path: filePath,
          nf_nome: arquivo.name,
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
