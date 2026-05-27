import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import type { AnaliseIaJson } from "@/types/credito";

interface GerarAnaliseIAResponse {
  analise_id: string;
  modelo: string;
  analise_ia: AnaliseIaJson;
}

export function useGerarAnaliseIA() {
  const qc = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (analise_id: string): Promise<GerarAnaliseIAResponse> => {
      const { data, error } = await supabase.functions.invoke("analisar-credito-ia", {
        body: { analise_id },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      return data as GerarAnaliseIAResponse;
    },
    onSuccess: (data, analise_id) => {
      qc.invalidateQueries({ queryKey: ["analise-detalhe", analise_id] });
      qc.invalidateQueries({ queryKey: ["analises-fila"] });
      toast({
        title: "Análise IA pronta",
        description: `Modelo: ${data.modelo} · Confiança: ${data.analise_ia.confianca}%`,
      });
    },
    onError: (e: Error) => {
      toast({
        title: "Erro ao gerar análise IA",
        description: e.message,
        variant: "destructive",
      });
    },
  });
}
