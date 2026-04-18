import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProblemaProntidao {
  codigo: string;
  severidade: "critico" | "aviso";
  mensagem: string;
  link: string | null;
}

export interface ProntidaoSistema {
  pronto: boolean;
  stats: {
    cargos: number;
    departamentos: number;
    unidades: number;
    deptos_sem_perfil: number;
    cargos_sem_depto: number;
  };
  problemas: ProblemaProntidao[];
}

export function useProntidaoSistema() {
  return useQuery({
    queryKey: ["prontidao-sistema"],
    queryFn: async (): Promise<ProntidaoSistema> => {
      const { data, error } = await supabase.rpc("validar_prontidao_sistema" as any);
      if (error) throw error;
      return data as unknown as ProntidaoSistema;
    },
    staleTime: 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
