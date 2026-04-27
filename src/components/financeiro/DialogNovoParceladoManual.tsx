import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { CategoriaCombobox } from "@/components/financeiro/CategoriaCombobox";
import { Switch } from "@/components/ui/switch";

interface DialogNovoParceladoManualProps {
  aberto: boolean;
  onFechar: () => void;
}

export default function DialogNovoParceladoManual({
  aberto,
  onFechar,
}: DialogNovoParceladoManualProps) {
  const qc = useQueryClient();
  const { data: categorias } = useCategoriasPlano();
  const [salvando, setSalvando] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [valorTotal, setValorTotal] = useState("");
  const [qtdParcelas, setQtdParcelas] = useState("3");
  const [dataPrimeiraParcela, setDataPrimeiraParcela] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [origem, setOrigem] = useState<"boleto" | "manual">("boleto");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [parceiroId, setParceiroId] = useState<string>("");
  const [contaBancariaId, setContaBancariaId] = useState<string>("");
  const [observacao, setObservacao] = useState("");
  const [mostrarTodas, setMostrarTodas] = useState(false);

  const categoriasFiltradas = useMemo(() => {
    if (mostrarTodas) return categorias || [];
    return (categorias || []).filter((c) => !c.codigo.startsWith("01"));
  }, [categorias, mostrarTodas]);

  const { data: parceiros } = useQuery({
    queryKey: ["parceiros-comerciais-lista"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parceiros_comerciais")
        .select("id, razao_social")
        .order("razao_social");
      return data || [];
    },
  });

  const { data: contas } = useQuery({
    queryKey: ["contas-bancarias-ativas"],
    queryFn: async () => {
      const { data } = await supabase
        .from("contas_bancarias")
        .select("id, nome_exibicao")
        .order("nome_exibicao");
      return data || [];
    },
  });

  function resetar() {
    setDescricao("");
    setValorTotal("");
    setQtdParcelas("3");
    setDataPrimeiraParcela(new Date().toISOString().slice(0, 10));
    setOrigem("boleto");
    setCategoriaId("");
    setParceiroId("");
    setContaBancariaId("");
    setObservacao("");
  }

  async function salvar() {
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    const valorTotalNum = parseFloat(valorTotal.replace(",", "."));
    if (isNaN(valorTotalNum) || valorTotalNum <= 0) {
      toast.error("Valor total inválido");
      return;
    }
    const qtdNum = parseInt(qtdParcelas, 10);
    if (isNaN(qtdNum) || qtdNum < 1 || qtdNum > 60) {
      toast.error("Quantidade de parcelas inválida (1-60)");
      return;
    }

    const valorParcela = Math.round((valorTotalNum / qtdNum) * 100) / 100;

    setSalvando(true);
    try {
      const payload = {
        descricao: descricao.trim(),
        descricao_normalizada: descricao
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim(),
        origem,
        valor_total: valorTotalNum,
        valor_parcela: valorParcela,
        qtd_parcelas: qtdNum,
        parcelas_pagas: 0,
        parcelas_previstas: 0,
        data_compra: dataPrimeiraParcela,
        data_primeira_parcela: dataPrimeiraParcela,
        status: "ativo",
        categoria_id: categoriaId || null,
        parceiro_id: parceiroId || null,
        conta_bancaria_id: contaBancariaId || null,
        observacao: observacao || null,
      };

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any)
        .from("compromissos_parcelados")
        .insert(payload)
        .select("id")
        .single();
      if (error) throw error;

      const compromissoId = (data as { id: string }).id;

      // Gera parcelas previstas (todas as parcelas)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: countData } = await (supabase as any).rpc(
        "gerar_parcelas_previstas",
        {
          p_compromisso_id: compromissoId,
          p_parcela_inicial: 1,
          p_parcela_final: qtdNum,
        },
      );

      toast.success(
        `Parcelado criado · ${countData ?? qtdNum} parcelas previstas geradas`,
      );

      qc.invalidateQueries({ queryKey: ["compromissos-parcelados-lista"] });
      qc.invalidateQueries({ queryKey: ["fluxo-caixa-futuro"] });
      qc.invalidateQueries({ queryKey: ["contas-pagar-receber"] });
      resetar();
      onFechar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog
      open={aberto}
      onOpenChange={(v) => {
        if (!v) {
          resetar();
          onFechar();
        }
      }}
    >
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Novo Parcelado Manual</DialogTitle>
          <DialogDescription>
            Boleto parcelado ou compromisso manual com parcelas fixas (fora do
            cartão de crédito).
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Boleto fornecedor X, Empréstimo Banco Y, ..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor Total (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={valorTotal}
                onChange={(e) => setValorTotal(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Origem *</Label>
              <Select
                value={origem}
                onValueChange={(v) => setOrigem(v as "boleto" | "manual")}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="boleto">Boleto Parcelado</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Qtd. Parcelas *</Label>
              <Input
                type="number"
                min="1"
                max="60"
                value={qtdParcelas}
                onChange={(e) => setQtdParcelas(e.target.value)}
              />
            </div>
            <div>
              <Label>1ª Parcela *</Label>
              <Input
                type="date"
                value={dataPrimeiraParcela}
                onChange={(e) => setDataPrimeiraParcela(e.target.value)}
              />
            </div>
          </div>

          {valorTotal && qtdParcelas && (
            <div className="text-xs text-muted-foreground italic">
              ↳ Valor por parcela: R${" "}
              {(
                parseFloat(valorTotal.replace(",", ".") || "0") /
                parseInt(qtdParcelas, 10)
              ).toFixed(2)}
            </div>
          )}

          <div>
            <Label>Categoria</Label>
            <Select value={categoriaId} onValueChange={setCategoriaId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar..." />
              </SelectTrigger>
              <SelectContent>
                {(categorias || []).map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.codigo} {c.nome}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Parceiro</Label>
              <Select value={parceiroId} onValueChange={setParceiroId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(parceiros || []).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.razao_social}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Conta de Saída</Label>
              <Select value={contaBancariaId} onValueChange={setContaBancariaId}>
                <SelectTrigger>
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  {(contas || []).map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.nome_exibicao}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label>Observação</Label>
            <Textarea
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              rows={2}
              placeholder="Número do boleto, contexto..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando ? "Salvando..." : "Criar e gerar parcelas previstas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
