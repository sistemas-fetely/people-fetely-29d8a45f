import { useEffect, useState } from "react";
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

type RecorrenteEditando = {
  id: string;
  descricao: string;
  valor: number;
  periodicidade: "mensal" | "trimestral" | "anual";
  dia_vencimento: number;
  data_inicio: string;
  data_fim: string | null;
  categoria_id: string | null;
  parceiro_id: string | null;
  conta_bancaria_id: string | null;
  observacao: string | null;
};

interface DialogNovoRecorrenteProps {
  aberto: boolean;
  onFechar: () => void;
  recorrenteEditando: RecorrenteEditando | null;
}

export default function DialogNovoRecorrente({
  aberto,
  onFechar,
  recorrenteEditando,
}: DialogNovoRecorrenteProps) {
  const qc = useQueryClient();
  const { data: categorias } = useCategoriasPlano();
  const [salvando, setSalvando] = useState(false);

  const [descricao, setDescricao] = useState("");
  const [valor, setValor] = useState("");
  const [periodicidade, setPeriodicidade] = useState<"mensal" | "trimestral" | "anual">("mensal");
  const [diaVencimento, setDiaVencimento] = useState("5");
  const [dataInicio, setDataInicio] = useState(
    new Date().toISOString().slice(0, 10),
  );
  const [dataFim, setDataFim] = useState("");
  const [categoriaId, setCategoriaId] = useState<string>("");
  const [parceiroId, setParceiroId] = useState<string>("");
  const [contaBancariaId, setContaBancariaId] = useState<string>("");
  const [observacao, setObservacao] = useState("");

  // Pre-fill quando editando
  useEffect(() => {
    if (recorrenteEditando) {
      setDescricao(recorrenteEditando.descricao);
      setValor(String(recorrenteEditando.valor));
      setPeriodicidade(recorrenteEditando.periodicidade);
      setDiaVencimento(String(recorrenteEditando.dia_vencimento));
      setDataInicio(recorrenteEditando.data_inicio);
      setDataFim(recorrenteEditando.data_fim || "");
      setCategoriaId(recorrenteEditando.categoria_id || "");
      setParceiroId(recorrenteEditando.parceiro_id || "");
      setContaBancariaId(recorrenteEditando.conta_bancaria_id || "");
      setObservacao(recorrenteEditando.observacao || "");
    } else {
      setDescricao("");
      setValor("");
      setPeriodicidade("mensal");
      setDiaVencimento("5");
      setDataInicio(new Date().toISOString().slice(0, 10));
      setDataFim("");
      setCategoriaId("");
      setParceiroId("");
      setContaBancariaId("");
      setObservacao("");
    }
  }, [recorrenteEditando, aberto]);

  // Listas auxiliares
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

  async function salvar() {
    if (!descricao.trim()) {
      toast.error("Descrição é obrigatória");
      return;
    }
    const valorNum = parseFloat(valor.replace(",", "."));
    if (isNaN(valorNum) || valorNum <= 0) {
      toast.error("Valor inválido");
      return;
    }
    const diaNum = parseInt(diaVencimento, 10);
    if (isNaN(diaNum) || diaNum < 1 || diaNum > 31) {
      toast.error("Dia de vencimento inválido (1-31)");
      return;
    }

    setSalvando(true);
    try {
      const payload = {
        descricao: descricao.trim(),
        descricao_normalizada: descricao
          .toLowerCase()
          .normalize("NFD")
          .replace(/[\u0300-\u036f]/g, "")
          .trim(),
        valor: valorNum,
        periodicidade,
        dia_vencimento: diaNum,
        data_inicio: dataInicio,
        data_fim: dataFim || null,
        categoria_id: categoriaId || null,
        parceiro_id: parceiroId || null,
        conta_bancaria_id: contaBancariaId || null,
        observacao: observacao || null,
        status: "ativo",
      };

      let recorrenteId: string;

      if (recorrenteEditando) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await (supabase as any)
          .from("compromissos_recorrentes")
          .update(payload)
          .eq("id", recorrenteEditando.id);
        if (error) throw error;
        recorrenteId = recorrenteEditando.id;

        // Cancela parcelas futuras antigas e regera
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase as any).rpc("cancelar_parcelas_futuras_recorrente", {
          p_recorrente_id: recorrenteId,
        });
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data, error } = await (supabase as any)
          .from("compromissos_recorrentes")
          .insert(payload)
          .select("id")
          .single();
        if (error) throw error;
        recorrenteId = (data as { id: string }).id;
      }

      // Gera parcelas previstas (12 meses)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: countData } = await (supabase as any).rpc(
        "gerar_parcelas_recorrentes",
        {
          p_recorrente_id: recorrenteId,
          p_meses_a_frente: 12,
        },
      );

      toast.success(
        `Recorrente ${recorrenteEditando ? "atualizado" : "criado"} · ${countData ?? 0} parcelas previstas geradas`,
      );

      qc.invalidateQueries({ queryKey: ["compromissos-recorrentes"] });
      qc.invalidateQueries({ queryKey: ["fluxo-caixa-futuro"] });
      qc.invalidateQueries({ queryKey: ["contas-pagar-receber"] });
      onFechar();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Erro ao salvar");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={(v) => !v && onFechar()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {recorrenteEditando ? "Editar Recorrente" : "Novo Compromisso Recorrente"}
          </DialogTitle>
          <DialogDescription>
            Aluguel, SaaS, anuidade e outros pagamentos que se repetem
            periodicamente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <div>
            <Label>Descrição *</Label>
            <Input
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Ex: Aluguel São Paulo, Notion Team, ..."
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Valor (R$) *</Label>
              <Input
                type="number"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
                placeholder="0,00"
              />
            </div>
            <div>
              <Label>Periodicidade *</Label>
              <Select
                value={periodicidade}
                onValueChange={(v) =>
                  setPeriodicidade(v as "mensal" | "trimestral" | "anual")
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensal">Mensal</SelectItem>
                  <SelectItem value="trimestral">Trimestral</SelectItem>
                  <SelectItem value="anual">Anual</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Dia Venc. *</Label>
              <Input
                type="number"
                min="1"
                max="31"
                value={diaVencimento}
                onChange={(e) => setDiaVencimento(e.target.value)}
              />
            </div>
            <div>
              <Label>Início *</Label>
              <Input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
              />
            </div>
            <div>
              <Label>Fim (opcional)</Label>
              <Input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
              />
            </div>
          </div>

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
              placeholder="Notas internas..."
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onFechar} disabled={salvando}>
            Cancelar
          </Button>
          <Button onClick={salvar} disabled={salvando}>
            {salvando
              ? "Salvando..."
              : recorrenteEditando
                ? "Salvar"
                : "Criar e gerar parcelas previstas"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
