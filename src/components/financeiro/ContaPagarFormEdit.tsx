import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Save, X, Sparkles, Check } from "lucide-react";
import { toast } from "sonner";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";

/**
 * Form de edição de Conta a Pagar — Fase 2 (29/04/2026).
 *
 * Doutrina cravada por Flavio:
 * - Edição liberada em status: rascunho, aberto, aprovado, aguardando_pagamento
 * - Read-only automático em: paga, cancelado
 * - Campos NUNCA editáveis aqui: valor, parceiro_id, data_compra, status, is_cartao
 *   (rastreio fiel: muda só por fluxo, não por edição manual)
 * - Auditoria mínima: gravado editado_por + editado_em via RPC
 */

type ContaEditavel = {
  id: string;
  descricao: string;
  data_vencimento: string | null;
  conta_id: string | null;
  centro_custo: string | null;
  forma_pagamento_id: string | null;
  observacao: string | null;
  nf_numero: string | null;
  nf_serie: string | null;
  nf_chave_acesso: string | null;
  status: string;
  parceiro_id?: string | null;
};

interface Props {
  conta: ContaEditavel;
  onSaved: () => void;
  onCancel: () => void;
}

const STATUS_READONLY = ["paga", "cancelado"];

export function ContaPagarFormEdit({ conta, onSaved, onCancel }: Props) {
  const qc = useQueryClient();
  const [salvando, setSalvando] = useState(false);

  const isReadOnly = STATUS_READONLY.includes(conta.status);

  // Estado local do form
  const [descricao, setDescricao] = useState(conta.descricao || "");
  const [dataVencimento, setDataVencimento] = useState(conta.data_vencimento || "");
  const [contaId, setContaId] = useState(conta.conta_id || "__none__");
  const [centroCusto, setCentroCusto] = useState(conta.centro_custo || "");
  const [formaPagamentoId, setFormaPagamentoId] = useState(conta.forma_pagamento_id || "__none__");
  const [observacao, setObservacao] = useState(conta.observacao || "");
  const [nfNumero, setNfNumero] = useState(conta.nf_numero || "");
  const [nfSerie, setNfSerie] = useState(conta.nf_serie || "");
  const [nfChave, setNfChave] = useState(conta.nf_chave_acesso || "");

  // Debounce da descrição (não dispara IA a cada tecla)
  const [descricaoDebounced, setDescricaoDebounced] = useState(descricao);
  useEffect(() => {
    const t = setTimeout(() => setDescricaoDebounced(descricao), 600);
    return () => clearTimeout(t);
  }, [descricao]);

  // Sugestão de categoria via RPC (só se ainda não há categoria definida)
  const semCategoria = !contaId || contaId === "__none__";
  const { data: sugestoes = [] } = useQuery({
    queryKey: ["sugerir-categoria-edit", conta.id, descricaoDebounced],
    enabled: descricaoDebounced.length >= 4 && semCategoria && !isReadOnly,
    staleTime: 30_000,
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data, error } = await (supabase as any).rpc(
        "sugerir_categoria_para_lancamento",
        {
          p_descricao: descricaoDebounced || null,
          p_cnpj: null,
          p_parceiro_id: conta.parceiro_id || null,
        },
      );
      if (error) throw error;
      return (data || []) as Array<{
        categoria_id: string;
        categoria_codigo: string;
        categoria_nome: string;
        score: number;
        motivo: string;
        amostra_descricao: string;
        amostra_count: number;
      }>;
    },
  });

  const topSugestao = sugestoes[0];
  const [sugestaoAplicada, setSugestaoAplicada] = useState(false);

  // Reseta form quando conta muda
  useEffect(() => {
    setDescricao(conta.descricao || "");
    setDataVencimento(conta.data_vencimento || "");
    setContaId(conta.conta_id || "__none__");
    setCentroCusto(conta.centro_custo || "");
    setFormaPagamentoId(conta.forma_pagamento_id || "__none__");
    setObservacao(conta.observacao || "");
    setNfNumero(conta.nf_numero || "");
    setNfSerie(conta.nf_serie || "");
    setNfChave(conta.nf_chave_acesso || "");
  }, [conta.id]); // eslint-disable-line react-hooks/exhaustive-deps

  // Categorias (plano de contas)
  const { data: categorias = [] } = useCategoriasPlano();

  // Formas de pagamento
  const { data: formasPgto = [] } = useQuery({
    queryKey: ["formas-pagamento-edit"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("formas_pagamento")
        .select("id, nome, codigo")
        .order("nome");
      if (error) throw error;
      return data || [];
    },
  });

  // Centros de custo (lista de strings distintos já usados — pragmatismo)
  // Quando virar tabela própria, troca pra hook dedicado.
  const { data: centrosCusto = [] } = useQuery({
    queryKey: ["centros-custo-distinct"],
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select("centro_custo")
        .not("centro_custo", "is", null)
        .limit(500);
      if (error) throw error;
      const set = new Set<string>();
      (data || []).forEach((r) => {
        if (r.centro_custo) set.add(r.centro_custo);
      });
      return Array.from(set).sort();
    },
  });

  async function handleSalvar() {
    if (isReadOnly) {
      toast.error("Conta com status read-only — edição bloqueada");
      return;
    }

    setSalvando(true);
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { data: result, error } = await (supabase as any).rpc("atualizar_conta_pagar_v2", {
        p_id: conta.id,
        p_descricao: descricao || null,
        p_data_vencimento: dataVencimento || null,
        p_conta_id: contaId === "__none__" ? null : contaId,
        p_centro_custo: centroCusto || null,
        p_forma_pagamento_id: formaPagamentoId === "__none__" ? null : formaPagamentoId,
        p_observacao: observacao || null,
        p_nf_numero: nfNumero || null,
        p_nf_serie: nfSerie || null,
        p_nf_chave_acesso: nfChave || null,
      });

      if (error) throw error;
      if (!result?.ok) {
        toast.error(result?.erro || "Erro ao salvar");
        return;
      }

      toast.success("Conta atualizada");
      qc.invalidateQueries({ queryKey: ["contas-pagar"] });
      qc.invalidateQueries({ queryKey: ["conta-pagar-detalhe", conta.id] });
      qc.invalidateQueries({ queryKey: ["qualidade-dado-map"] });
      onSaved();
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div className="space-y-4">
      {isReadOnly && (
        <div className="p-3 rounded-md bg-zinc-100 text-zinc-600 text-xs">
          Conta com status <strong>{conta.status}</strong> — leitura apenas.
        </div>
      )}

      {/* Descrição */}
      <div className="space-y-1">
        <Label htmlFor="cp-edit-descricao">Descrição</Label>
        <Input
          id="cp-edit-descricao"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          disabled={isReadOnly || salvando}
        />
      </div>

      {/* Data de vencimento */}
      <div className="space-y-1">
        <Label htmlFor="cp-edit-vencimento">Data de vencimento</Label>
        <Input
          id="cp-edit-vencimento"
          type="date"
          value={dataVencimento}
          onChange={(e) => setDataVencimento(e.target.value)}
          disabled={isReadOnly || salvando}
        />
      </div>

      {/* Categoria (plano de contas) */}
      <div className="space-y-1">
        <Label>Categoria (plano de contas)</Label>
        <Select
          value={contaId}
          onValueChange={setContaId}
          disabled={isReadOnly || salvando}
        >
          <SelectTrigger>
            <SelectValue placeholder="Definir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sem categoria —</SelectItem>
            {categorias.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.codigo} {c.nome}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {topSugestao
          && semCategoria
          && !sugestaoAplicada
          && topSugestao.score >= 60
          && !isReadOnly && (
            <div className="mt-2 rounded-md border border-blue-200 bg-blue-50/60 p-2.5">
              <div className="flex items-start gap-2">
                <Sparkles className="h-4 w-4 text-blue-600 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-blue-900">
                    ✨ Sugestão IA: {topSugestao.categoria_codigo} {topSugestao.categoria_nome}
                  </div>
                  <div className="text-[11px] text-blue-700 mt-0.5">
                    {topSugestao.motivo} · baseado em {topSugestao.amostra_count}{" "}
                    {topSugestao.amostra_count === 1 ? "lançamento" : "lançamentos"} similar
                    {topSugestao.amostra_count === 1 ? "" : "es"}
                  </div>
                  {topSugestao.amostra_descricao && (
                    <div className="text-[11px] text-blue-600/80 mt-0.5 italic truncate">
                      ex: "{topSugestao.amostra_descricao}"
                    </div>
                  )}
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  className="h-7 px-2 border-blue-300 text-blue-700 hover:bg-blue-100 shrink-0"
                  onClick={() => {
                    setContaId(topSugestao.categoria_id);
                    setSugestaoAplicada(true);
                    toast.success("Categoria aplicada");
                  }}
                >
                  <Check className="h-3.5 w-3.5 mr-1" />
                  Aplicar
                </Button>
              </div>
            </div>
          )}
      </div>

      {/* Centro de custo */}
      <div className="space-y-1">
        <Label>Centro de custo</Label>
        <Select
          value={centroCusto || "__none__"}
          onValueChange={(v) => setCentroCusto(v === "__none__" ? "" : v)}
          disabled={isReadOnly || salvando}
        >
          <SelectTrigger>
            <SelectValue placeholder="Definir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Sem centro de custo —</SelectItem>
            {centrosCusto.map((c) => (
              <SelectItem key={c} value={c}>{c}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Forma de pagamento */}
      <div className="space-y-1">
        <Label>Forma de pagamento</Label>
        <Select
          value={formaPagamentoId}
          onValueChange={setFormaPagamentoId}
          disabled={isReadOnly || salvando}
        >
          <SelectTrigger>
            <SelectValue placeholder="Definir..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">— Não definido —</SelectItem>
            {formasPgto.map((f) => (
              <SelectItem key={f.id} value={f.id}>{f.nome}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Dados NF */}
      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label htmlFor="cp-edit-nf-numero">Nº da NF</Label>
          <Input
            id="cp-edit-nf-numero"
            value={nfNumero}
            onChange={(e) => setNfNumero(e.target.value)}
            disabled={isReadOnly || salvando}
            placeholder="Ex: 12345"
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="cp-edit-nf-serie">Série</Label>
          <Input
            id="cp-edit-nf-serie"
            value={nfSerie}
            onChange={(e) => setNfSerie(e.target.value)}
            disabled={isReadOnly || salvando}
            placeholder="Ex: 1"
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="cp-edit-nf-chave">Chave de acesso (44 dígitos)</Label>
        <Input
          id="cp-edit-nf-chave"
          value={nfChave}
          onChange={(e) => setNfChave(e.target.value)}
          disabled={isReadOnly || salvando}
          placeholder="Opcional"
        />
      </div>

      {/* Observação */}
      <div className="space-y-1">
        <Label htmlFor="cp-edit-obs">Observação</Label>
        <Textarea
          id="cp-edit-obs"
          value={observacao}
          onChange={(e) => setObservacao(e.target.value)}
          disabled={isReadOnly || salvando}
          rows={3}
          placeholder="Notas internas sobre essa conta..."
        />
      </div>

      {/* Footer com botões */}
      <div className="flex gap-2 pt-2 border-t">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onCancel}
          disabled={salvando}
        >
          <X className="h-4 w-4 mr-1" />
          {isReadOnly ? "Fechar" : "Cancelar"}
        </Button>
        {!isReadOnly && (
          <Button
            className="flex-1"
            onClick={handleSalvar}
            disabled={salvando}
          >
            {salvando ? (
              <Loader2 className="h-4 w-4 mr-1 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-1" />
            )}
            Salvar
          </Button>
        )}
      </div>
    </div>
  );
}

export default ContaPagarFormEdit;
