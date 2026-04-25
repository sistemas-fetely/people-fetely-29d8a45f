import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";
import type { NFParsed } from "@/lib/financeiro/types";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nf: NFParsed | null;
  categoriaId: string | null;
  categoriaNome: string | null;
  centroCusto?: string | null;
}

type TipoRegra = "fornecedor" | "ncm" | "ambos";

export function CriarRegraDialog({
  open,
  onOpenChange,
  nf,
  categoriaId,
  categoriaNome,
  centroCusto,
}: Props) {
  const [salvando, setSalvando] = useState(false);
  const qc = useQueryClient();

  if (!nf || !categoriaId) return null;

  const cnpj = nf.fornecedor_cnpj || null;
  const ncm = nf.nf_ncm || null;
  const ncmPrefixo = ncm ? ncm.substring(0, 4) : null;

  async function criarRegra(tipo: TipoRegra) {
    setSalvando(true);
    try {
      const inserts: Array<Record<string, unknown>> = [];

      if ((tipo === "fornecedor" || tipo === "ambos") && cnpj) {
        inserts.push({
          cnpj_emitente: cnpj,
          conta_plano_id: categoriaId,
          centro_custo: centroCusto || null,
          prioridade: 5,
          ativo: true,
        });
      }

      if ((tipo === "ncm" || tipo === "ambos") && ncmPrefixo) {
        inserts.push({
          ncm_prefixo: ncmPrefixo,
          conta_plano_id: categoriaId,
          centro_custo: centroCusto || null,
          prioridade: 10,
          ativo: true,
        });
      }

      if (tipo === "ambos" && cnpj && ncmPrefixo) {
        // Regra mais específica: combina CNPJ + NCM (prioridade ainda maior)
        inserts.push({
          cnpj_emitente: cnpj,
          ncm_prefixo: ncmPrefixo,
          conta_plano_id: categoriaId,
          centro_custo: centroCusto || null,
          prioridade: 1,
          ativo: true,
        });
      }

      for (const ins of inserts) {
        const { error } = await supabase
          .from("regras_categorizacao")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert(ins as any);
        if (error) throw error;
      }

      toast.success("Regra criada! Próxima vez será automático.");
      qc.invalidateQueries({ queryKey: ["regras-categorizacao"] });
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro ao criar regra: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="text-base flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-admin" />
            Criar regra automática?
          </DialogTitle>
          <DialogDescription>
            Na próxima importação, esta categoria será sugerida automaticamente para casos
            semelhantes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {cnpj && (
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => criarRegra("fornecedor")}
              disabled={salvando}
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Sempre que for {nf.fornecedor_nome}
                </p>
                <p className="text-xs text-muted-foreground">
                  Qualquer NF desse fornecedor → {categoriaNome}
                </p>
              </div>
            </Button>
          )}

          {ncmPrefixo && (
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => criarRegra("ncm")}
              disabled={salvando}
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Sempre que NCM começar com {ncmPrefixo}
                </p>
                <p className="text-xs text-muted-foreground">
                  Qualquer produto com esse NCM → {categoriaNome}
                </p>
              </div>
            </Button>
          )}

          {cnpj && ncmPrefixo && (
            <Button
              variant="outline"
              className="w-full justify-start text-left h-auto py-3"
              onClick={() => criarRegra("ambos")}
              disabled={salvando}
            >
              <div className="space-y-1">
                <p className="font-medium text-sm">
                  Fornecedor + NCM (mais específico)
                </p>
                <p className="text-xs text-muted-foreground">
                  {nf.fornecedor_nome} com NCM {ncmPrefixo} → {categoriaNome}
                </p>
              </div>
            </Button>
          )}

          <Button
            variant="ghost"
            className="w-full text-sm text-muted-foreground"
            onClick={() => onOpenChange(false)}
            disabled={salvando}
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : null}
            Não criar regra (só esta vez)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
