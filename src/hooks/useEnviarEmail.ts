import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useEnviarEmail() {
  return useMutation({
    mutationFn: async (contaId: string) => {
      const { data, error } = await supabase.functions.invoke(
        "enviar-email-conta-aprovada",
        { body: { contaId } },
      );

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success("Email enviado!");
    },
    onError: (e: Error) => {
      toast.error("Erro ao enviar email: " + e.message);
    },
  });
}
