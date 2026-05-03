/**
 * useGruposEmpresariais — hook canônico de leitura/gerenciamento de grupos.
 *
 * Padrão Doutrina #14 (dimensão sempre via tabela): nunca hardcode lista de
 * grupos em código. Quem precisa ler grupos importa daqui.
 */
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type GrupoEmpresarial = {
  id: string;
  nome: string;
  descricao: string | null;
  cnpj_raiz: string | null;
  tipo_controle: string | null;
  observacao: string | null;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type TipoControle =
  | "holding_formal"
  | "mesmo_dono"
  | "controle_indireto"
  | "agrupamento_operacional"
  | "outro";

export const TIPO_CONTROLE_LABELS: Record<TipoControle, string> = {
  holding_formal: "Holding formal",
  mesmo_dono: "Mesmo dono",
  controle_indireto: "Controle indireto",
  agrupamento_operacional: "Agrupamento operacional",
  outro: "Outro",
};

/**
 * Lista todos os grupos empresariais.
 * @param somenteAtivos se true, filtra ativo=true (default: true)
 */
export function useGruposEmpresariais(somenteAtivos: boolean = true) {
  return useQuery({
    queryKey: ["grupos-empresariais", { somenteAtivos }],
    queryFn: async () => {
      let query = supabase
        .from("grupos_empresariais")
        .select("*")
        .order("nome");

      if (somenteAtivos) {
        query = query.eq("ativo", true);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []) as GrupoEmpresarial[];
    },
  });
}

/**
 * Mutation para criar grupo (criação inline rápida — só nome).
 * Detalhes ricos (descricao, tipo_controle, observacao) ficam pra tela CRUD.
 */
export function useCriarGrupoRapido() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (nome: string): Promise<GrupoEmpresarial> => {
      const nomeTrim = nome.trim();
      if (!nomeTrim) throw new Error("Nome do grupo é obrigatório");

      const { data, error } = await supabase
        .from("grupos_empresariais")
        .insert({ nome: nomeTrim })
        .select()
        .single();

      if (error) {
        // Doutrina #7: nome é UNIQUE — duplicidade vira erro do Postgres
        if (error.code === "23505") {
          throw new Error(`Já existe um grupo com o nome "${nomeTrim}"`);
        }
        throw error;
      }
      return data as GrupoEmpresarial;
    },
    onSuccess: (grupo) => {
      queryClient.invalidateQueries({ queryKey: ["grupos-empresariais"] });
      toast.success(`Grupo "${grupo.nome}" criado`, {
        description:
          "Edite descrição, tipo de controle e observações em Parceiros → Grupos.",
      });
    },
    onError: (error: Error) => {
      toast.error("Erro ao criar grupo", { description: error.message });
    },
  });
}
