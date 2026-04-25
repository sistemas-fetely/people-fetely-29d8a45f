import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Check, FileText, UserCheck, Send, ThumbsUp, X, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { formatBRL, formatDateBR } from "@/lib/format-currency";
import RegistrarPagamentoDialog from "./RegistrarPagamentoDialog";
import StatusProgressBar from "./StatusProgressBar";
import TimelineHistorico from "./TimelineHistorico";
import EnviarPagamentoDialog from "./EnviarPagamentoDialog";
import { useContaWorkflow, type ContaStatus } from "@/hooks/useContaWorkflow";

type Conta = {
  id: string;
  tipo: string;
  descricao: string;
  valor: number;
  valor_pago?: number | null;
  data_vencimento: string | null;
  data_pagamento: string | null;
  status: string;
  fornecedor_cliente: string | null;
  parceiro_id?: string | null;
  conta_id: string | null;
  centro_custo: string | null;
  forma_pagamento_id: string | null;
  origem: string | null;
  observacao?: string | null;
  observacao_pagamento?: string | null;
  comprovante_url?: string | null;
  nf_chave_acesso?: string | null;
  nf_numero?: string | null;
  nf_serie?: string | null;
  nf_pdf_url?: string | null;
  nf_xml_url?: string | null;
  parcela_atual?: number | null;
  parcelas?: number | null;
  email_pagamento_enviado?: boolean | null;
  enviado_pagamento_em?: string | null;
  dados_pagamento_fornecedor?: { banco?: string; agencia?: string; conta?: string; pix?: string } | null;
  plano_contas?: { codigo?: string | null; nome?: string | null } | null;
  formas_pagamento?: { nome?: string | null } | null;
  parceiros_comerciais?: { razao_social?: string | null } | null;
};

const STATUS_LABEL: Record<string, string> = {
  rascunho: "Rascunho",
  aberto: "Aberto",
  atrasado: "Atrasado",
  aprovado: "Aprovado",
  agendado: "Enviado",
  pago: "Pago",
  cancelado: "Cancelado",
  conciliado: "Conciliado",
};

const STATUS_STYLE: Record<string, string> = {
  rascunho: "bg-muted text-muted-foreground",
  aberto: "bg-blue-100 text-blue-800 hover:bg-blue-100",
  atrasado: "bg-red-100 text-red-800 hover:bg-red-100",
  aprovado: "bg-purple-100 text-purple-800 hover:bg-purple-100",
  agendado: "bg-amber-100 text-amber-800 hover:bg-amber-100",
  pago: "bg-green-100 text-green-800 hover:bg-green-100",
  cancelado: "bg-gray-100 text-gray-700 hover:bg-gray-100",
};

const PODE_PAGAR = new Set(["aberto", "atrasado", "aprovado", "agendado"]);

interface Props {
  contaId: string | null;
  onClose: () => void;
}

export default function ContaPagarDetalheDrawer({ contaId, onClose }: Props) {
  const [showPag, setShowPag] = useState(false);
  const [showEnviar, setShowEnviar] = useState(false);
  const workflow = useContaWorkflow();

  const { data: conta } = useQuery({
    queryKey: ["conta-pagar-detalhe", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select(
          "*, plano_contas:conta_id(codigo,nome), formas_pagamento:forma_pagamento_id(nome), parceiros_comerciais:parceiro_id(razao_social)"
        )
        .eq("id", contaId!)
        .single();
      if (error) throw error;
      return data as unknown as Conta;
    },
  });

  const { data: comprovUrl } = useQuery({
    queryKey: ["comprovante-url", conta?.comprovante_url],
    enabled: !!conta?.comprovante_url,
    queryFn: async () => {
      const { data } = await supabase.storage
        .from("comprovantes-pagamento")
        .createSignedUrl(conta!.comprovante_url!, 60 * 10);
      return data?.signedUrl || null;
    },
  });

  const { data: nfPjId } = useQuery({
    queryKey: ["nf-pj-by-numero", conta?.nf_numero, conta?.origem],
    enabled: !!conta && conta.origem === "nf_pj_interno" && !!conta.nf_numero,
    queryFn: async () => {
      const { data } = await supabase
        .from("notas_fiscais_pj")
        .select("id")
        .eq("numero", conta!.nf_numero!)
        .limit(1)
        .maybeSingle();
      return data?.id || null;
    },
  });

  const { data: itens } = useQuery({
    queryKey: ["conta-pagar-itens", contaId],
    enabled: !!contaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_pagar_itens")
        .select("id, descricao, ncm, quantidade, unidade, valor_total, conta_plano_id, plano_contas:conta_plano_id(codigo, nome)")
        .eq("conta_id", contaId!);
      if (error) throw error;
      return (data || []) as Array<{
        id: string;
        descricao: string;
        ncm: string | null;
        quantidade: number | null;
        unidade: string | null;
        valor_total: number | null;
        conta_plano_id: string | null;
        plano_contas?: { codigo?: string | null; nome?: string | null } | null;
      }>;
    },
  });

  const temCategoriasMultiplas = (() => {
    if (!itens || itens.length < 2) return false;
    const cats = new Set(itens.map((i) => i.conta_plano_id || "_sem"));
    return cats.size > 1;
  })();

  return (
    <Sheet open={!!contaId} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-md overflow-y-auto">
        {!conta ? (
          <div className="py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : (
          <>
            <SheetHeader className="text-left">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <SheetTitle className="truncate">{conta.descricao}</SheetTitle>
                  <SheetDescription className="flex items-center gap-2 flex-wrap">
                    <span>{conta.tipo === "pagar" ? "Conta a pagar" : "Conta a receber"}</span>
                    {conta.origem === "nf_pj_interno" && (
                      <Badge variant="outline" className="gap-1 text-xs">
                        <UserCheck className="h-3 w-3" /> NF PJ
                      </Badge>
                    )}
                  </SheetDescription>
                </div>
                <Badge className={STATUS_STYLE[conta.status] || "bg-muted"}>
                  {STATUS_LABEL[conta.status] || conta.status}
                </Badge>
              </div>
              <div className="text-2xl font-bold mt-2">{formatBRL(conta.valor)}</div>
              {conta.origem === "nf_pj_interno" && nfPjId && (
                <Link
                  to={`/notas-fiscais/${nfPjId}`}
                  className="text-sm text-admin underline mt-1 inline-block"
                >
                  Ver NF PJ original no People →
                </Link>
              )}
            </SheetHeader>

            <div className="mt-4">
              <StatusProgressBar statusAtual={conta.status} />
            </div>

            <Separator className="my-4" />

            <div className="space-y-3 text-sm">
              <Linha label="Parceiro" value={conta.parceiros_comerciais?.razao_social || conta.fornecedor_cliente || "—"} />
              <Linha
                label="Categoria"
                value={
                  conta.plano_contas
                    ? `${conta.plano_contas.codigo || ""} ${conta.plano_contas.nome || ""}`.trim()
                    : "—"
                }
              />
              <Linha label="Centro de custo" value={conta.centro_custo || "—"} />
              <Linha label="Forma de pagamento" value={conta.formas_pagamento?.nome || "—"} />
              <Linha label="Vencimento" value={formatDateBR(conta.data_vencimento)} />
              {conta.data_pagamento && (
                <Linha label="Pago em" value={formatDateBR(conta.data_pagamento)} />
              )}
              {conta.valor_pago != null && conta.valor_pago !== conta.valor && (
                <Linha label="Valor pago" value={formatBRL(conta.valor_pago)} />
              )}
              {conta.parcelas && conta.parcelas > 1 && (
                <Linha label="Parcela" value={`${conta.parcela_atual || 1} de ${conta.parcelas}`} />
              )}
              <Linha label="Origem" value={conta.origem || "manual"} />

              {conta.observacao && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Observação</div>
                  <p className="text-sm">{conta.observacao}</p>
                </div>
              )}
              {conta.observacao_pagamento && (
                <div>
                  <div className="text-xs text-muted-foreground mb-1">Observação do pagamento</div>
                  <p className="text-sm">{conta.observacao_pagamento}</p>
                </div>
              )}
            </div>

            {(conta.nf_chave_acesso || conta.nf_numero) && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">NF vinculada</p>
                  {conta.nf_numero && <Linha label="Número/Série" value={`${conta.nf_numero}${conta.nf_serie ? "/" + conta.nf_serie : ""}`} />}
                  {conta.nf_chave_acesso && (
                    <Linha label="Chave" value={<span className="font-mono text-[11px] break-all">{conta.nf_chave_acesso}</span>} />
                  )}
                  <div className="flex gap-2 pt-1">
                    {conta.nf_pdf_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={conta.nf_pdf_url} target="_blank" rel="noreferrer">PDF</a>
                      </Button>
                    )}
                    {conta.nf_xml_url && (
                      <Button size="sm" variant="outline" asChild>
                        <a href={conta.nf_xml_url} target="_blank" rel="noreferrer">XML</a>
                      </Button>
                    )}
                  </div>
                </div>
              </>
            )}

            {itens && itens.length > 0 && temCategoriasMultiplas && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">
                    Classificação por item
                  </p>
                  <div className="space-y-2">
                    {itens.map((item) => (
                      <div
                        key={item.id}
                        className="flex justify-between items-start gap-3 p-2 rounded bg-muted/50 text-xs"
                      >
                        <div className="flex-1 min-w-0">
                          <p className="font-medium truncate">{item.descricao}</p>
                          <p className="text-muted-foreground">
                            NCM: {item.ncm || "—"}
                            {item.quantidade != null && (
                              <> · Qtd: {item.quantidade} {item.unidade || ""}</>
                            )}
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-medium">{formatBRL(item.valor_total || 0)}</p>
                          <p className="text-muted-foreground">
                            {item.plano_contas
                              ? `${item.plano_contas.codigo || ""} ${item.plano_contas.nome || ""}`.trim()
                              : "Sem categoria"}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}

            {conta.comprovante_url && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  <p className="text-xs font-medium text-muted-foreground uppercase">Comprovante</p>
                  {comprovUrl ? (
                    <Button size="sm" variant="outline" asChild className="gap-2">
                      <a href={comprovUrl} target="_blank" rel="noreferrer">
                        <FileText className="h-4 w-4" /> Ver comprovante
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Carregando link…</p>
                  )}
                </div>
              </>
            )}

            {conta.tipo === "pagar" && (
              <>
                <Separator className="my-4" />
                <div className="space-y-2">
                  {conta.status === "rascunho" && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-blue-700 hover:bg-blue-800 text-white gap-2"
                        onClick={async () => {
                          await workflow.mudarStatus.mutateAsync({
                            contaId: conta.id,
                            statusAnterior: conta.status,
                            novoStatus: "aberto" as ContaStatus,
                          });
                          onClose();
                        }}
                      >
                        <ShieldCheck className="h-4 w-4" /> Validar e abrir
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600"
                        onClick={async () => {
                          await workflow.mudarStatus.mutateAsync({
                            contaId: conta.id,
                            statusAnterior: conta.status,
                            novoStatus: "cancelado" as ContaStatus,
                            observacao: "Cancelado manualmente",
                          });
                          onClose();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {(conta.status === "aberto" || conta.status === "atrasado") && (
                    <div className="flex gap-2">
                      <Button
                        className="flex-1 bg-purple-700 hover:bg-purple-800 text-white gap-2"
                        onClick={async () => {
                          await workflow.mudarStatus.mutateAsync({
                            contaId: conta.id,
                            statusAnterior: conta.status,
                            novoStatus: "aprovado" as ContaStatus,
                          });
                          onClose();
                        }}
                      >
                        <ThumbsUp className="h-4 w-4" /> Aprovar
                      </Button>
                      <Button
                        variant="outline"
                        className="text-red-600"
                        onClick={async () => {
                          await workflow.mudarStatus.mutateAsync({
                            contaId: conta.id,
                            statusAnterior: conta.status,
                            novoStatus: "cancelado" as ContaStatus,
                            observacao: "Cancelado manualmente",
                          });
                          onClose();
                        }}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  )}

                  {conta.status === "aprovado" && (
                    <Button
                      className="w-full bg-amber-600 hover:bg-amber-700 text-white gap-2"
                      onClick={() => setShowEnviar(true)}
                    >
                      <Send className="h-4 w-4" /> Enviar para pagamento
                    </Button>
                  )}

                  {conta.status === "agendado" && (
                    <Button
                      onClick={() => setShowPag(true)}
                      className="w-full bg-green-700 hover:bg-green-800 text-white gap-2"
                    >
                      <Check className="h-4 w-4" /> Registrar pagamento
                    </Button>
                  )}

                  {conta.status === "pago" && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-green-50 text-green-700 text-sm">
                      <Check className="h-4 w-4" /> Pago em {formatDateBR(conta.data_pagamento)}
                    </div>
                  )}

                  {conta.status === "conciliado" && (
                    <div className="flex items-center gap-2 p-3 rounded-lg bg-teal-50 text-teal-700 text-sm">
                      <ShieldCheck className="h-4 w-4" /> Conciliado
                    </div>
                  )}
                </div>
              </>
            )}

            {showPag && (
              <RegistrarPagamentoDialog
                open={showPag}
                onOpenChange={setShowPag}
                conta={{
                  id: conta.id,
                  descricao: conta.descricao,
                  valor: conta.valor,
                  forma_pagamento_id: conta.forma_pagamento_id,
                }}
                onPaid={onClose}
              />
            )}

            {showEnviar && (
              <EnviarPagamentoDialog
                open={showEnviar}
                onOpenChange={setShowEnviar}
                conta={conta}
                onDone={onClose}
              />
            )}

            <Separator className="my-4" />
            <TimelineHistorico contaId={conta.id} />
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

function Linha({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-3">
      <span className="text-xs text-muted-foreground shrink-0">{label}</span>
      <span className="text-sm text-right">{value}</span>
    </div>
  );
}
