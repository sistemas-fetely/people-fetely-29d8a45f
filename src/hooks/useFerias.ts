import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Tables, TablesInsert } from "@/integrations/supabase/types";

type FeriasPeriodo = Tables<"ferias_periodos">;
type FeriasProgramacao = Tables<"ferias_programacoes">;
type FeriasPJ = Tables<"ferias_pj">;

export interface PeriodoComColaborador extends FeriasPeriodo {
  colaborador?: {
    nome_completo: string;
    cargo: string;
    departamento: string;
    data_admissao: string;
  };
  programacoes?: FeriasProgramacao[];
}

export interface PeriodoPJComContrato {
  id: string;
  contrato_id: string;
  periodo_inicio: string;
  periodo_fim: string;
  dias_direito: number;
  dias_gozados: number;
  dias_vendidos: number;
  saldo: number | null;
  status: string;
  observacoes: string | null;
  created_at: string;
  updated_at: string;
  contrato?: {
    contato_nome: string;
    nome_fantasia: string | null;
    razao_social: string;
    departamento: string;
    data_inicio: string;
  };
  programacoes?: FeriasPJ[];
}

export interface FeriasPJComContrato extends FeriasPJ {
  contrato?: {
    contato_nome: string;
    nome_fantasia: string | null;
    razao_social: string;
    departamento: string;
  };
}

// ---- CLT ----
export function useFeriasPeriodos() {
  return useQuery({
    queryKey: ["ferias_periodos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias_periodos")
        .select("*, colaboradores_clt!inner(nome_completo, cargo, departamento, data_admissao), ferias_programacoes(*)")
        .order("periodo_fim", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        colaborador: p.colaboradores_clt,
        programacoes: p.ferias_programacoes || [],
      })) as PeriodoComColaborador[];
    },
  });
}

export function useCriarPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"ferias_periodos">) => {
      const { data, error } = await supabase.from("ferias_periodos").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ferias_periodos"] }); toast.success("Período aquisitivo criado"); },
    onError: () => toast.error("Erro ao criar período"),
  });
}

export function useCriarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"ferias_programacoes">) => {
      const { data, error } = await supabase.from("ferias_programacoes").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_periodos"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_colaborador"] });
      toast.success("Férias programadas");
    },
    onError: () => toast.error("Erro ao programar férias"),
  });
}

export function useAtualizarStatusProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ferias_programacoes").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_periodos"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_colaborador"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });
}

export function useEditarProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data_inicio, data_fim, dias, tipo, observacoes }: {
      id: string; data_inicio: string; data_fim: string; dias: number; tipo: string; observacoes?: string | null;
    }) => {
      const { error } = await supabase.from("ferias_programacoes").update({ data_inicio, data_fim, dias, tipo, observacoes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_periodos"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_colaborador"] });
      toast.success("Programação atualizada");
    },
    onError: () => toast.error("Erro ao atualizar programação"),
  });
}

export function useExcluirProgramacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferias_programacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_periodos"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_colaborador"] });
      toast.success("Programação excluída");
    },
    onError: () => toast.error("Erro ao excluir programação"),
  });
}

export function useExcluirPeriodo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("ferias_periodos").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_periodos"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_colaborador"] });
      toast.success("Período excluído");
    },
    onError: () => toast.error("Erro ao excluir período"),
  });
}

// ---- PJ ----
export function useFeriasPeriodosPJ() {
  return useQuery({
    queryKey: ["ferias_periodos_pj"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias_periodos_pj")
        .select("*, contratos_pj!inner(contato_nome, nome_fantasia, razao_social, departamento, data_inicio), ferias_pj(*)")
        .order("periodo_fim", { ascending: false });
      if (error) throw error;
      return (data || []).map((p: any) => ({
        ...p,
        contrato: p.contratos_pj,
        programacoes: p.ferias_pj || [],
      })) as PeriodoPJComContrato[];
    },
  });
}

export function useCriarPeriodoPJ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { contrato_id: string; periodo_inicio: string; periodo_fim: string; dias_direito: number }) => {
      const { data, error } = await supabase.from("ferias_periodos_pj").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["ferias_periodos_pj"] }); toast.success("Período PJ criado"); },
    onError: () => toast.error("Erro ao criar período PJ"),
  });
}

export function useFeriasPJ() {
  return useQuery({
    queryKey: ["ferias_pj"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ferias_pj")
        .select("*, contratos_pj!inner(contato_nome, nome_fantasia, razao_social, departamento)")
        .order("data_inicio", { ascending: false });
      if (error) throw error;
      return (data || []).map((f: any) => ({
        ...f,
        contrato: f.contratos_pj,
      })) as FeriasPJComContrato[];
    },
  });
}

export function useCriarFeriasPJ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"ferias_pj">) => {
      const { data, error } = await supabase.from("ferias_pj").insert(input).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_pj"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_pj"] });
      toast.success("Recesso PJ registrado");
    },
    onError: () => toast.error("Erro ao registrar recesso"),
  });
}

export function useAtualizarStatusFeriasPJ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase.from("ferias_pj").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_pj"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_pj"] });
      toast.success("Status atualizado");
    },
    onError: () => toast.error("Erro ao atualizar status"),
  });
}

export function useEditarFeriasPJ() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, data_inicio, data_fim, dias, tipo, observacoes }: {
      id: string; data_inicio: string; data_fim: string; dias: number; tipo: string; observacoes?: string | null;
    }) => {
      const { error } = await supabase.from("ferias_pj").update({ data_inicio, data_fim, dias, tipo, observacoes }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["ferias_pj"] });
      qc.invalidateQueries({ queryKey: ["ferias_periodos_pj"] });
      toast.success("Recesso atualizado");
    },
    onError: () => toast.error("Erro ao atualizar recesso"),
  });
}
