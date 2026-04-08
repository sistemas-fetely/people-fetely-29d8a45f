import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface PosicaoInsert {
  titulo_cargo: string;
  nivel_hierarquico: number;
  departamento: string;
  area?: string | null;
  filial?: string | null;
  status: string;
  id_pai?: string | null;
  colaborador_id?: string | null;
  contrato_pj_id?: string | null;
  salario_previsto?: number | null;
  centro_custo?: string | null;
}

interface PosicaoUpdate extends Partial<PosicaoInsert> {
  id: string;
}

export function useCreatePosicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (data: PosicaoInsert) => {
      const { error } = await supabase.from("posicoes").insert(data as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organograma"] });
      toast.success("Posição criada com sucesso");
    },
    onError: (e: Error) => toast.error(`Erro ao criar posição: ${e.message}`),
  });
}

export function useUpdatePosicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...data }: PosicaoUpdate) => {
      const { error } = await supabase.from("posicoes").update(data as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organograma"] });
      toast.success("Posição atualizada com sucesso");
    },
    onError: (e: Error) => toast.error(`Erro ao atualizar: ${e.message}`),
  });
}

export function useDeletePosicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("posicoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organograma"] });
      toast.success("Posição removida com sucesso");
    },
    onError: (e: Error) => toast.error(`Erro ao remover: ${e.message}`),
  });
}

export function useMovePosicao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, newParentId }: { id: string; newParentId: string | null }) => {
      const { error } = await supabase.from("posicoes").update({ id_pai: newParentId } as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["organograma"] });
      toast.success("Posição movida com sucesso");
    },
    onError: (e: Error) => toast.error(`Erro ao mover: ${e.message}`),
  });
}
