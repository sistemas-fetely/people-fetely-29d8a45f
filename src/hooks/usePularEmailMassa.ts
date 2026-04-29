import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/**
 * Sprint Melhorias CP (29/04/2026) — pular fase do email.
 *
 * Move um lote de contas em status "aprovado" diretamente para
 * "aguardando_pagamento" SEM disparar o fluxo de envio de email.
 *
 * Marca explicitamente no histórico que o email foi pulado.
 * Define forma_pagamento_id obrigatória (única info que a fase exige).
 */

export interface PularEmailInput {
  contaIds: string[];
  formaPagamentoId: string;
  observacaoExtra?: string;
}

export interface PularEmailResult {
  sucesso: number;
  erros: number;
  total: number;
}

export function usePularEmailMassa() {
  const { user } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: PularEmailInput): Promise<PularEmailResult> => {
      const { contaIds, formaPagamentoId, observacaoExtra } = input;

      if (!contaIds.length) throw new Error("Nenhuma conta selecionada");
      if (!formaPagamentoId) throw new Error("Forma de pagamento é obrigatória");

      let sucesso = 0;
      let erros = 0;

      const observacao = observacaoExtra?.trim()
        ? `Email pulado em massa. ${observacaoExtra.trim()}`
        : "Email pulado em massa — definição direta da forma de pagamento.";

      // Loop sequencial pra preservar ordem do histórico e poder
      // contabilizar erros individuais (1 conta com problema não derruba o lote).
      for (const contaId of contaIds) {
        try {
          // 1. Update da conta: define forma_pagamento + status novo
          const { error: updErr } = await supabase
            .from("contas_pagar_receber")
            .update({
              status: "aguardando_pagamento",
              forma_pagamento_id: formaPagamentoId,
              email_pagamento_enviado: false,
              updated_at: new Date().toISOString(),
            })
            .eq("id", contaId)
            .eq("status", "aprovado"); // Guard: só passa se ainda em aprovado

          if (updErr) {
            erros++;
            console.error("Erro update conta", contaId, updErr);
            continue;
          }

          // 2. Histórico explícito da transição
          await supabase.from("contas_pagar_historico").insert({
            conta_id: contaId,
            status_anterior: "aprovado",
            status_novo: "aguardando_pagamento",
            observacao,
            usuario_id: user?.id || null,
          });

          sucesso++;
        } catch (e) {
          erros++;
          console.error("Erro loop pular email", contaId, e);
        }
      }

      return { sucesso, erros, total: contaIds.length };
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["conta-pagar-detalhe"] });
      qc.invalidateQueries({ queryKey: ["cp-historico"] });

      let msg = `${res.sucesso} conta${res.sucesso !== 1 ? "s" : ""} avançada${res.sucesso !== 1 ? "s" : ""} sem email`;
      if (res.erros > 0) msg += ` (${res.erros} erro${res.erros > 1 ? "s" : ""})`;

      if (res.sucesso > 0) toast.success(msg);
      else toast.error(msg);
    },
    onError: (e: Error) => {
      toast.error("Erro: " + (e.message || String(e)));
    },
  });
}
