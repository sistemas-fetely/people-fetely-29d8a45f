import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
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
import { Badge } from "@/components/ui/badge";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import { useContaWorkflow } from "@/hooks/useContaWorkflow";

type Conta = {
  id: string;
  fornecedor_cliente: string | null;
  parceiro_id: string | null;
  valor: number;
  data_vencimento: string | null;
  status: string;
  nf_numero?: string | null;
  nf_pdf_url?: string | null;
  nf_xml_url?: string | null;
  plano_contas?: { codigo?: string | null; nome?: string | null } | null;
  parceiros_comerciais?: { razao_social?: string | null } | null;
  dados_pagamento_fornecedor?: {
    banco?: string;
    agencia?: string;
    conta?: string;
    pix?: string;
  } | null;
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: Conta;
  onDone: () => void;
}

export default function EnviarPagamentoDialog({ open, onOpenChange, conta, onDone }: Props) {
  const { user } = useAuth();
  const { mudarStatus } = useContaWorkflow();
  const [enviando, setEnviando] = useState(false);

  const [dadosPgto, setDadosPgto] = useState({
    banco: "",
    agencia: "",
    conta: "",
    pix: "",
  });
  const [emailDestinatario, setEmailDestinatario] = useState("");
  const [obsEnvio, setObsEnvio] = useState("");

  // Buscar últimos dados bancários usados pra esse parceiro
  const { data: ultimosDados } = useQuery({
    queryKey: ["ultimos-dados-pgto", conta.parceiro_id, conta.fornecedor_cliente],
    enabled: open,
    queryFn: async () => {
      const query = supabase
        .from("contas_pagar_receber")
        .select("dados_pagamento_fornecedor")
        .not("dados_pagamento_fornecedor", "is", null)
        .order("enviado_pagamento_em", { ascending: false })
        .limit(1);

      if (conta.parceiro_id) {
        query.eq("parceiro_id", conta.parceiro_id);
      } else if (conta.fornecedor_cliente) {
        query.eq("fornecedor_cliente", conta.fornecedor_cliente);
      }

      const { data } = await query.maybeSingle();
      return (data?.dados_pagamento_fornecedor as typeof dadosPgto | null) || null;
    },
  });

  // Destinatários financeiros
  const { data: destinatarios } = useQuery({
    queryKey: ["config-financeiro-externo"],
    enabled: open,
    queryFn: async () => {
      const { data } = await supabase
        .from("config_financeiro_externo")
        .select("*")
        .eq("ativo", true)
        .order("nome");
      return data || [];
    },
  });

  useEffect(() => {
    if (!open) return;
    if (conta.dados_pagamento_fornecedor) {
      setDadosPgto({
        banco: conta.dados_pagamento_fornecedor.banco || "",
        agencia: conta.dados_pagamento_fornecedor.agencia || "",
        conta: conta.dados_pagamento_fornecedor.conta || "",
        pix: conta.dados_pagamento_fornecedor.pix || "",
      });
    } else if (ultimosDados) {
      setDadosPgto({
        banco: ultimosDados.banco || "",
        agencia: ultimosDados.agencia || "",
        conta: ultimosDados.conta || "",
        pix: ultimosDados.pix || "",
      });
    }
  }, [open, ultimosDados, conta.dados_pagamento_fornecedor]);

  useEffect(() => {
    if (destinatarios && destinatarios.length > 0 && !emailDestinatario) {
      setEmailDestinatario(destinatarios[0].email);
    }
  }, [destinatarios, emailDestinatario]);

  const fornecedorNome = useMemo(
    () =>
      conta.parceiros_comerciais?.razao_social ||
      conta.fornecedor_cliente ||
      "Fornecedor",
    [conta],
  );

  const categoriaTxt = conta.plano_contas
    ? `${conta.plano_contas.codigo || ""} ${conta.plano_contas.nome || ""}`.trim()
    : "—";

  async function handleEnviar() {
    if (!emailDestinatario) {
      toast.error("Selecione um destinatário");
      return;
    }
    setEnviando(true);
    try {
      // 1) Salvar dados bancários + mudar status para agendado
      await mudarStatus.mutateAsync({
        contaId: conta.id,
        statusAnterior: conta.status,
        novoStatus: "agendado",
        observacao: `Enviado para pagamento: ${emailDestinatario}${obsEnvio ? ` — ${obsEnvio}` : ""}`,
        extras: {
          dados_pagamento_fornecedor: dadosPgto,
          enviado_pagamento_em: new Date().toISOString(),
          enviado_pagamento_por: user?.id || null,
        },
      });

      // 2) Enviar email (best-effort)
      const emailResult = await supabase.functions.invoke("send-transactional-email", {
        body: {
          templateName: "pagamento-solicitacao",
          recipientEmail: emailDestinatario,
          idempotencyKey: `pgto-${conta.id}-${Date.now()}`,
          templateData: {
            fornecedor: fornecedorNome,
            valor: formatBRL(conta.valor),
            vencimento: formatDateBR(conta.data_vencimento),
            nf_numero: conta.nf_numero || "—",
            categoria: categoriaTxt,
            banco: dadosPgto.banco || "—",
            agencia: dadosPgto.agencia || "—",
            conta_bancaria: dadosPgto.conta || "—",
            pix: dadosPgto.pix || "—",
            observacao: obsEnvio || "—",
            solicitante: user?.email || "",
          },
        },
      });

      const emailOk = !emailResult.error;

      await supabase
        .from("contas_pagar_receber")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .update({ email_pagamento_enviado: emailOk } as any)
        .eq("id", conta.id);

      // 3) Criar tarefa Uauuu (best-effort)
      try {
        const venc = conta.data_vencimento ? new Date(conta.data_vencimento) : null;
        const urgente =
          venc && venc.getTime() <= Date.now() + 3 * 86400000;

        const { data: tarefa } = await supabase
          .from("sncf_tarefas")
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .insert({
            titulo: `Pagamento: ${fornecedorNome} — ${formatBRL(conta.valor)}`,
            descricao: `Vencimento: ${formatDateBR(conta.data_vencimento)}. NF: ${conta.nf_numero || "sem NF"}. Verificar pagamento e registrar no sistema.`,
            status: "pendente",
            prioridade: urgente ? "alta" : "media",
            prazo_data: conta.data_vencimento,
            area_destino: "financeiro",
            tipo_processo: "pagamento_fornecedor",
            sistema_origem: "financeiro",
            criado_por: user?.id || null,
            link_acao: `/administrativo/contas-pagar?id=${conta.id}`,
          } as any)
          .select("id")
          .maybeSingle();

        if (tarefa?.id) {
          await supabase
            .from("contas_pagar_receber")
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            .update({ tarefa_id: tarefa.id } as any)
            .eq("id", conta.id);
        }
      } catch (e) {
        console.warn("Falha ao criar tarefa (não bloqueante):", e);
      }

      if (emailOk) {
        toast.success(`Enviado! Email para ${emailDestinatario}`);
      } else {
        toast.warning(
          `Status atualizado, mas email falhou. Verifique a configuração.`,
        );
      }
      onDone();
      onOpenChange(false);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      toast.error("Erro: " + msg);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Enviar para pagamento</DialogTitle>
          <DialogDescription>
            Um email será enviado ao financeiro com todos os dados e documentos.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Resumo */}
          <div className="p-3 rounded-lg border bg-muted/30 text-sm space-y-1">
            <p>
              <span className="text-muted-foreground">Fornecedor:</span>{" "}
              <span className="font-medium">{fornecedorNome}</span>
            </p>
            <p>
              <span className="text-muted-foreground">Valor:</span>{" "}
              <span className="font-mono font-semibold text-admin">
                {formatBRL(conta.valor)}
              </span>
            </p>
            <p>
              <span className="text-muted-foreground">Vencimento:</span>{" "}
              {formatDateBR(conta.data_vencimento)}
            </p>
            {conta.nf_numero && (
              <p>
                <span className="text-muted-foreground">NF:</span> {conta.nf_numero}
              </p>
            )}
            {categoriaTxt !== "—" && (
              <p>
                <span className="text-muted-foreground">Categoria:</span>{" "}
                {categoriaTxt}
              </p>
            )}
          </div>

          {/* Dados bancários */}
          <div className="space-y-2">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Dados bancários do fornecedor
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs">Banco</Label>
                <Input
                  value={dadosPgto.banco}
                  onChange={(e) => setDadosPgto({ ...dadosPgto, banco: e.target.value })}
                  placeholder="Ex: Itaú"
                />
              </div>
              <div>
                <Label className="text-xs">Agência</Label>
                <Input
                  value={dadosPgto.agencia}
                  onChange={(e) => setDadosPgto({ ...dadosPgto, agencia: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Conta</Label>
                <Input
                  value={dadosPgto.conta}
                  onChange={(e) => setDadosPgto({ ...dadosPgto, conta: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">PIX</Label>
                <Input
                  value={dadosPgto.pix}
                  onChange={(e) => setDadosPgto({ ...dadosPgto, pix: e.target.value })}
                  placeholder="CNPJ, email, etc"
                />
              </div>
            </div>
          </div>

          {/* Destinatário */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Enviar para
            </Label>
            {destinatarios && destinatarios.length > 0 ? (
              <select
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
                className="w-full h-9 px-3 rounded-md border bg-background text-sm"
              >
                {destinatarios.map((fin) => (
                  <option key={fin.id} value={fin.email}>
                    {fin.nome} ({fin.email})
                  </option>
                ))}
              </select>
            ) : (
              <Input
                value={emailDestinatario}
                onChange={(e) => setEmailDestinatario(e.target.value)}
                placeholder="financeiro@empresa.com"
              />
            )}
          </div>

          {/* Observação */}
          <div className="space-y-1">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">
              Observação para o financeiro
            </Label>
            <Textarea
              value={obsEnvio}
              onChange={(e) => setObsEnvio(e.target.value)}
              placeholder="Opcional"
              rows={2}
            />
          </div>

          {/* Documentos */}
          {(conta.nf_pdf_url || conta.nf_xml_url) && (
            <div className="text-xs text-muted-foreground">
              Documentos referenciados:
              {conta.nf_pdf_url && (
                <Badge variant="outline" className="ml-1">PDF da NF</Badge>
              )}
              {conta.nf_xml_url && (
                <Badge variant="outline" className="ml-1">XML da NF</Badge>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={enviando}>
            Cancelar
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando}
            className="bg-amber-600 hover:bg-amber-700 text-white gap-2"
          >
            {enviando ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            Enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
