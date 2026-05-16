import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Loader2, Plus } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { useAuth } from "@/contexts/AuthContext";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const sb = supabase as any;

type Origem = "stage_1" | "stage_2_debito" | "stage_2_credito";

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  origem: Origem;
  fonteId: string;
  resumo: {
    titulo: string;
    valor: number;
    data: string | null;
    info?: string;
  };
  descricaoInicial?: string;
  parceiroSugeridoId?: string | null;
  onSucesso?: () => void;
};

type CategoriaRow = {
  id: string;
  codigo: string;
  nome: string;
  tipo: string;
  parent_id: string | null;
};

type ParceiroOption = {
  id: string;
  razao_social: string | null;
  nome_fantasia: string | null;
};

export function CriarCPRAvulsaDialog({
  open, onOpenChange, origem, fonteId, resumo,
  descricaoInicial, parceiroSugeridoId, onSucesso,
}: Props) {
  const { user } = useAuth();
  const [descricao, setDescricao] = useState(descricaoInicial ?? "");
  const [categoriaId, setCategoriaId] = useState("");
  const [parceiroId, setParceiroId] = useState(parceiroSugeridoId ?? "");
  const [salvando, setSalvando] = useState(false);

  const tipo: "despesa" | "receita" = origem === "stage_2_credito" ? "receita" : "despesa";

  useEffect(() => {
    if (open) {
      setDescricao(descricaoInicial ?? "");
      setCategoriaId("");
      setParceiroId(parceiroSugeridoId ?? "");
    }
  }, [open, descricaoInicial, parceiroSugeridoId]);

  const { data: categorias = [] } = useQuery({
    queryKey: ["plano-contas-folhas-tipo", tipo],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb
        .from("plano_contas")
        .select("id, codigo, nome, tipo, parent_id")
        .eq("tipo", tipo)
        .eq("ativo", true)
        .order("codigo");
      const todas = (data || []) as CategoriaRow[];
      const idsPais = new Set(todas.map((c) => c.parent_id).filter(Boolean));
      return todas.filter((c) => !idsPais.has(c.id));
    },
  });

  const { data: parceiros = [] } = useQuery({
    queryKey: ["parceiros-options"],
    enabled: open,
    queryFn: async () => {
      const { data } = await sb
        .from("parceiros_comerciais")
        .select("id, razao_social, nome_fantasia")
        .eq("ativo", true)
        .order("razao_social");
      return (data || []) as ParceiroOption[];
    },
  });

  function rpcParaOrigem(): string {
    if (origem === "stage_1") return "criar_cpr_e_vincular_stage_1";
    if (origem === "stage_2_debito") return "criar_cpr_e_vincular_stage_2_debito";
    return "criar_cpr_receita_stage_2_credito";
  }

  function paramParaOrigem(): string {
    return origem === "stage_1" ? "p_planilha_id" : "p_ofx_id";
  }

  async function handleSalvar() {
    if (!descricao.trim()) {
      toast.error("Descrição obrigatória");
      return;
    }
    if (!categoriaId) {
      toast.error("Categoria obrigatória");
      return;
    }
    setSalvando(true);
    try {
      const { data, error } = await sb.rpc(rpcParaOrigem(), {
        [paramParaOrigem()]: fonteId,
        p_descricao: descricao.trim(),
        p_categoria_id: categoriaId,
        p_parceiro_id: parceiroId || null,
        p_user_id: user?.id ?? null,
      });
      if (error) throw error;
      if (!data?.ok) throw new Error(data?.motivo || "Falha desconhecida");
      toast.success(
        origem === "stage_2_credito"
          ? "Receita registrada ✓"
          : "Despesa criada e conciliada ✓"
      );
      onSucesso?.();
      onOpenChange(false);
    } catch (e: any) {
      toast.error("Erro: " + e.message);
    } finally {
      setSalvando(false);
    }
  }

  const titulo =
    origem === "stage_1" ? "Criar CPR avulsa (Stage 1)" :
    origem === "stage_2_debito" ? "Criar despesa avulsa (Stage 2)" :
    "Registrar receita (Stage 2)";

  const descricaoTexto =
    origem === "stage_1"
      ? "Cria uma despesa nascida paga e vincula esta linha da planilha. Use quando a CPR não estava registrada antes."
      : origem === "stage_2_debito"
      ? "Cria uma despesa nascida paga a partir deste débito do extrato. Use para débitos avulsos sem planilha."
      : "Registra uma receita a partir deste crédito do extrato. Vínculo Stage 2 + pg_em automáticos.";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{titulo}</DialogTitle>
          <DialogDescription>{descricaoTexto}</DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-md bg-muted/50 space-y-1">
          <div className="flex items-center justify-between gap-3">
            <span className="font-medium truncate text-sm">{resumo.titulo}</span>
            <span className="font-medium tabular-nums text-sm">{formatBRL(resumo.valor)}</span>
          </div>
          <div className="text-xs text-muted-foreground">
            {resumo.data ? formatDateBR(resumo.data) : "—"}
            {resumo.info ? ` · ${resumo.info}` : ""}
          </div>
        </div>

        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="cpr-desc">Descrição</Label>
            <Input
              id="cpr-desc"
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descrição clara da despesa/receita"
              className="h-9"
            />
          </div>

          <div className="space-y-1.5">
            <Label>Categoria (plano de contas)</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="Selecione uma categoria folha" />
              </SelectTrigger>
              <SelectContent>
                {categorias.length === 0 ? (
                  <div className="px-2 py-1.5 text-xs text-muted-foreground">
                    Nenhuma categoria folha disponível
                  </div>
                ) : (
                  categorias.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.codigo} — {c.nome}
                    </SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>{tipo === "receita" ? "Cliente" : "Fornecedor"} (opcional)</Label>
            <Select value={parceiroId || "_"} onValueChange={(v) => setParceiroId(v === "_" ? "" : v)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder="— sem parceiro —" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="_">— sem parceiro —</SelectItem>
                {parceiros.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.razao_social ?? p.nome_fantasia ?? p.id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={handleSalvar} disabled={salvando}>
            {salvando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {tipo === "receita" ? "Registrar receita" : "Criar despesa paga"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
