import { useState } from "react";
import { CheckCircle2, XCircle, Loader2, FileText, AlertTriangle, DollarSign, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  tarefaId: string;
  notaId: string;
}

export function AprovarNFDialog({ open, onOpenChange, tarefaId, notaId }: Props) {
  const [motivo, setMotivo] = useState("");
  const [loading, setLoading] = useState(false);
  const [acaoAtiva, setAcaoAtiva] = useState<"aprovar" | "rejeitar" | null>(null);
  const queryClient = useQueryClient();

  const { data: detalhe, isLoading } = useQuery({
    queryKey: ["nf-aprovacao-detalhe", notaId],
    enabled: open && !!notaId,
    queryFn: async () => {
      const { data: nota, error: e1 } = await supabase
        .from("notas_fiscais_pj")
        .select("*, contratos_pj(razao_social, nome_fantasia, cnpj, valor_mensal, contato_nome)")
        .eq("id", notaId)
        .single();
      if (e1) throw e1;

      const { data: cls } = await supabase
        .from("nf_pj_classificacoes")
        .select("*")
        .eq("nota_fiscal_id", notaId)
        .order("ordem");

      let pdfUrl: string | null = null;
      if (nota.arquivo_url) {
        const { data: signed } = await supabase.storage
          .from("notas-fiscais-pj")
          .createSignedUrl(nota.arquivo_url, 600);
        pdfUrl = signed?.signedUrl || null;
      }

      return { nota, classificacoes: cls || [], pdfUrl };
    },
  });

  const { data: destinatariosFinanceiro } = useQuery({
    queryKey: ["config-financeiro-externo"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("config_financeiro_externo")
        .select("email, nome")
        .eq("ativo", true)
        .order("nome");

      if (error) {
        console.error("Erro ao buscar destinatários financeiros:", error);
        return [];
      }

      return data || [];
    },
  });

  async function handleAprovar() {
    setLoading(true);
    setAcaoAtiva("aprovar");
    try {
      const { data: rpcRes, error: rpcErr } = await supabase.rpc("aprovar_nf_pj", {
        _nota_id: notaId,
        _observacao_rh: motivo || null,
      });
      if (rpcErr) throw rpcErr;
      if ((rpcRes as any)?.erro) throw new Error((rpcRes as any).erro);

      if (!destinatariosFinanceiro || destinatariosFinanceiro.length === 0) {
        toast.warning("Nenhum destinatário configurado em Financeiro Externo. NF aprovada mas email não enviado.");
      } else if (detalhe?.nota && detalhe?.pdfUrl) {
        const contrato = detalhe.nota.contratos_pj as any;

        const emailPromises = destinatariosFinanceiro.map(async (dest) => {
          const { error: emailErr } = await supabase.functions.invoke("send-transactional-email", {
            body: {
              templateName: "nf-pagamento",
              recipientEmail: dest.email,
              idempotencyKey: `nf-pag-${notaId}-${dest.email}-${Date.now()}`,
              templateData: {
                nomeColaborador: contrato?.contato_nome,
                nomeFantasia: contrato?.nome_fantasia || contrato?.razao_social,
                numeroNF: detalhe.nota.numero,
                valor: `R$ ${Number(detalhe.nota.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`,
                dataVencimento: detalhe.nota.data_vencimento || detalhe.nota.data_emissao,
                arquivoUrl: detalhe.pdfUrl,
              },
            },
          });

          if (emailErr) {
            console.error(`Erro ao enviar para ${dest.email}:`, emailErr);
            return { email: dest.email, erro: emailErr.message, sucesso: false };
          }

          return { email: dest.email, sucesso: true };
        });

        const resultados = await Promise.all(emailPromises);
        const sucessos = resultados.filter((r) => r.sucesso).length;
        const erros = resultados.filter((r) => !r.sucesso);

        if (sucessos > 0) {
          await supabase.rpc("marcar_nf_enviada_pagamento", {
            _nota_id: notaId,
            _email_destinatario: destinatariosFinanceiro.map((d) => d.email).join(", "),
          });
          toast.success(`NF aprovada! Email enviado para ${sucessos} destinatário${sucessos > 1 ? "s" : ""}`);
        }
        if (erros.length > 0) {
          toast.error(`${erros.length} email${erros.length > 1 ? "s" : ""} falharam`);
        }
      } else {
        toast.success("NF aprovada!");
      }

      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-tarefas"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-notas"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro na aprovação");
    } finally {
      setLoading(false);
      setAcaoAtiva(null);
    }
  }

  async function handleRejeitar() {
    if (motivo.trim().length < 10) {
      toast.error("Motivo obrigatório, mínimo 10 caracteres");
      return;
    }
    setLoading(true);
    setAcaoAtiva("rejeitar");
    try {
      const { data, error } = await supabase.rpc("rejeitar_nf_pj", {
        _nota_id: notaId,
        _motivo: motivo,
      });
      if (error) throw error;
      if ((data as any)?.erro) throw new Error((data as any).erro);

      toast.success("NF rejeitada. PJ foi notificado via tarefa.");
      queryClient.invalidateQueries({ queryKey: ["tarefas"] });
      queryClient.invalidateQueries({ queryKey: ["minhas-tarefas"] });
      onOpenChange(false);
    } catch (err: any) {
      toast.error(err.message || "Erro ao rejeitar");
    } finally {
      setLoading(false);
      setAcaoAtiva(null);
    }
  }

  const nota = detalhe?.nota;
  const contrato = nota?.contratos_pj as any;
  const totalClass = (detalhe?.classificacoes || []).reduce((s, c: any) => s + Number(c.valor), 0);
  const temExtras = (detalhe?.classificacoes || []).some((c: any) => c.categoria_valor !== "contrato");
  const emailOk = !!destinatariosFinanceiro && destinatariosFinanceiro.length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5 text-primary" />
            Aprovar NF PJ
          </DialogTitle>
          <DialogDescription>
            Revise os dados e decida. Aprovar dispara email automático pro responsável pelo pagamento.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : nota ? (
          <div className="space-y-4">
            {/* Resumo da NF */}
            <Card>
              <CardContent className="pt-4 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-medium text-sm">{contrato?.contato_nome}</p>
                    <p className="text-xs text-muted-foreground">
                      {contrato?.nome_fantasia || contrato?.razao_social} · CNPJ {contrato?.cnpj}
                    </p>
                  </div>
                  <Badge variant="outline">Comp. {nota.competencia}</Badge>
                </div>
                <div className="grid grid-cols-3 gap-3 text-xs">
                  <div>
                    <p className="text-muted-foreground">NF</p>
                    <p className="font-medium">{nota.numero}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Emissão</p>
                    <p className="font-medium">
                      {new Date(nota.data_emissao + "T00:00:00").toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Valor</p>
                    <p className="font-medium">
                      R$ {Number(nota.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Classificações */}
            <div className="space-y-2">
              <Label className="text-xs">Classificação de valores</Label>
              <div className="space-y-2">
                {(detalhe?.classificacoes || []).map((c: any) => (
                  <Card key={c.id}>
                    <CardContent className="pt-3 pb-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant={c.categoria_valor === "contrato" ? "default" : "secondary"}>
                              {c.categoria_valor === "contrato" ? "Mensalidade" : c.categoria_valor}
                            </Badge>
                            <span className="text-sm font-medium">
                              R$ {Number(c.valor).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                            </span>
                          </div>
                          {c.descricao_adicional && (
                            <p className="text-xs text-muted-foreground mt-1">{c.descricao_adicional}</p>
                          )}
                          {c.justificativa && (
                            <p className="text-xs text-muted-foreground mt-1">
                              <span className="font-medium">Justificativa:</span> {c.justificativa}
                            </p>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
              {temExtras && (
                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription className="text-xs">
                    Esta NF tem valores extras (não-contrato) com justificativa. Valide manualmente antes de aprovar.
                  </AlertDescription>
                </Alert>
              )}
            </div>

            {/* PDF */}
            {detalhe?.pdfUrl && (
              <Button variant="outline" size="sm" asChild className="w-full">
                <a href={detalhe.pdfUrl} target="_blank" rel="noopener noreferrer">
                  <FileText className="h-3.5 w-3.5 mr-2" />
                  Abrir PDF da NF
                </a>
              </Button>
            )}

            {/* Email destino */}
            {emailOk ? (
              <Alert>
                <Mail className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Ao aprovar, email será enviado para:{" "}
                  <strong>
                    {destinatariosFinanceiro?.map((d) => `${d.nome} <${d.email}>`).join(", ")}
                  </strong>
                </AlertDescription>
              </Alert>
            ) : (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription className="text-xs">
                  Nenhum destinatário ativo em <strong>Financeiro Externo</strong>. Configure em Parâmetros → Financeiro externo.
                </AlertDescription>
              </Alert>
            )}

            {/* Motivo */}
            <div className="space-y-2">
              <Label className="text-xs">Observações / Motivo (obrigatório se rejeitar)</Label>
              <Textarea
                value={motivo}
                onChange={(e) => setMotivo(e.target.value)}
                placeholder="Ex: Aprovada sem ressalvas. Para rejeitar, descreva o problema (mín 10 caracteres)."
                rows={3}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={loading}>
            Fechar
          </Button>
          <Button
            variant="destructive"
            onClick={handleRejeitar}
            disabled={loading || motivo.trim().length < 10}
            className="gap-2"
          >
            {loading && acaoAtiva === "rejeitar" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <XCircle className="h-3.5 w-3.5" />
            Rejeitar
          </Button>
          <Button onClick={handleAprovar} disabled={loading} className="gap-2">
            {loading && acaoAtiva === "aprovar" && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            <CheckCircle2 className="h-3.5 w-3.5" />
            Aprovar e enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
