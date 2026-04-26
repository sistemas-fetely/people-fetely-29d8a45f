import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Pencil, Paperclip, FileText, Check, X, ArrowRight, Undo2 } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  useContaHistorico,
  useAtualizarStatus,
  useUnidades,
  CENTROS_CUSTO,
  type ContaPagarComRelacionados,
  type ContaPagarStatus,
} from "@/hooks/useContasPagar";

interface DetalheContaSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  conta: ContaPagarComRelacionados | null;
  onEditar: () => void;
}

const formatarValor = (valor: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

const formatarData = (data: string | null | undefined) =>
  data ? new Date(data).toLocaleDateString("pt-BR") : "—";

const formatarDataHora = (data: string | null | undefined) =>
  data
    ? new Date(data).toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <div className="text-sm text-foreground">{children}</div>
    </div>
  );
}

// Stepper horizontal do workflow
const FLUXO: { key: ContaPagarStatus; label: string }[] = [
  { key: "rascunho", label: "Rascunho" },
  { key: "pendente", label: "Pendente" },
  { key: "aprovado", label: "Aprovado" },
  { key: "pago", label: "Pago" },
  { key: "finalizado", label: "Finalizado" },
];

function WorkflowStepper({ status }: { status: ContaPagarStatus }) {
  if (status === "cancelado") {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-center">
        <Badge variant="outline" className="border-destructive text-destructive">
          <X className="h-3 w-3 mr-1" />
          Conta Cancelada
        </Badge>
      </div>
    );
  }

  const idxAtual = FLUXO.findIndex((s) => s.key === status);

  return (
    <div className="flex items-center w-full">
      {FLUXO.map((step, idx) => {
        const isPast = idx < idxAtual;
        const isCurrent = idx === idxAtual;
        const isFuture = idx > idxAtual;

        return (
          <div key={step.key} className="flex items-center flex-1 last:flex-none">
            <div className="flex flex-col items-center gap-1">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-xs font-semibold border-2 transition-colors",
                  isPast && "bg-success border-success text-success-foreground",
                  isCurrent && "bg-primary border-primary text-primary-foreground ring-4 ring-primary/20",
                  isFuture && "bg-muted border-muted-foreground/20 text-muted-foreground",
                )}
              >
                {isPast ? <Check className="h-4 w-4" /> : idx + 1}
              </div>
              <span
                className={cn(
                  "text-[10px] text-center whitespace-nowrap",
                  isCurrent ? "text-primary font-semibold" : "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
            </div>
            {idx < FLUXO.length - 1 && (
              <div
                className={cn(
                  "h-0.5 flex-1 mx-1 mb-5",
                  isPast ? "bg-success" : "bg-muted",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

export function DetalheContaSheet({
  open,
  onOpenChange,
  conta,
  onEditar,
}: DetalheContaSheetProps) {
  const { data: historico = [] } = useContaHistorico(open && conta ? conta.id : null);
  const { data: unidades = [] } = useUnidades();
  const atualizarStatus = useAtualizarStatus();

  if (!conta) return null;

  const nomeParceiro = conta.parceiro?.razao_social || conta.fornecedor;
  const fantasia = conta.parceiro?.nome_fantasia;
  const centroCustoLabel =
    CENTROS_CUSTO.find((c) => c.value === conta.centro_custo)?.label ?? conta.centro_custo;
  const unidadeObj = unidades.find((u) => u.id === conta.unidade);
  const unidadeLabel = unidadeObj?.nome ?? conta.unidade;

  const handleAvancar = (novoStatus: ContaPagarStatus) => {
    atualizarStatus.mutate({ contaId: conta.id, novoStatus });
  };

  const isCancelado = conta.status === "cancelado";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{conta.descricao}</SheetTitle>
              <SheetDescription className="mt-1">
                <Badge className={STATUS_COLORS[conta.status]}>
                  {STATUS_LABELS[conta.status]}
                </Badge>
              </SheetDescription>
            </div>
            <Button size="sm" variant="outline" onClick={onEditar}>
              <Pencil className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </SheetHeader>

        <div className="space-y-6 mt-6">
          {/* Workflow Stepper */}
          <div>
            <WorkflowStepper status={conta.status} />
          </div>

          {/* Botões de próximo passo */}
          {!isCancelado && (
            <div className="space-y-2">
              {conta.status === "rascunho" && (
                <Button
                  className="w-full"
                  onClick={() => handleAvancar("pendente")}
                  disabled={atualizarStatus.isPending}
                >
                  <ArrowRight className="h-4 w-4 mr-2" />
                  Validar → Pendente
                </Button>
              )}
              {conta.status === "pendente" && (
                <>
                  <Button
                    className="w-full bg-success hover:bg-success/90 text-success-foreground"
                    onClick={() => handleAvancar("aprovado")}
                    disabled={atualizarStatus.isPending}
                  >
                    <Check className="h-4 w-4 mr-2" />
                    Aprovar → Aprovado
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAvancar("rascunho")}
                    disabled={atualizarStatus.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Voltar para Rascunho
                  </Button>
                </>
              )}
              {conta.status === "aprovado" && (
                <>
                  <div className="rounded-md bg-muted/50 border border-dashed p-3 text-center text-sm text-muted-foreground">
                    Aguardando processo de pagamento (Fase 2)
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    onClick={() => handleAvancar("pendente")}
                    disabled={atualizarStatus.isPending}
                  >
                    <Undo2 className="h-4 w-4 mr-2" />
                    Voltar para Pendente
                  </Button>
                </>
              )}

              {/* Cancelar */}
              {conta.status !== "finalizado" && (
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full text-destructive hover:text-destructive hover:bg-destructive/10"
                  onClick={() => handleAvancar("cancelado")}
                  disabled={atualizarStatus.isPending}
                >
                  <X className="h-4 w-4 mr-2" />
                  Cancelar Conta
                </Button>
              )}
            </div>
          )}

          <Separator />

          {/* Parceiro */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Parceiro</h3>
            <div className="space-y-3">
              <Field label="Razão Social">{nomeParceiro}</Field>
              {fantasia && <Field label="Nome Fantasia">{fantasia}</Field>}
            </div>
          </div>

          <Separator />

          {/* Valores */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Valores e Datas</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Valor">
                <span className="font-semibold tabular-nums">
                  {formatarValor(conta.valor)}
                </span>
              </Field>
              <Field label="Parcelas">{conta.parcelas ?? 1}</Field>
              <Field label="Data Emissão">{formatarData(conta.data_emissao)}</Field>
              <Field label="Vencimento">{formatarData(conta.vencimento)}</Field>
              {conta.data_pagamento && (
                <Field label="Data Pagamento">{formatarData(conta.data_pagamento)}</Field>
              )}
              {conta.valor_pago != null && (
                <Field label="Valor Pago">
                  <span className="tabular-nums">{formatarValor(conta.valor_pago)}</span>
                </Field>
              )}
            </div>
          </div>

          <Separator />

          {/* Classificação */}
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">Classificação</h3>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Categoria">
                {conta.categoria ? (
                  <div>
                    <span className="font-mono text-xs text-muted-foreground mr-1">
                      {conta.categoria.codigo}
                    </span>
                    {conta.categoria.nome}
                  </div>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </Field>
              <Field label="Forma de Pagamento">
                {conta.forma_pagamento ?? <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Centro de Custo">
                {centroCustoLabel ?? <span className="text-muted-foreground">—</span>}
              </Field>
              <Field label="Unidade">
                {unidadeLabel ?? <span className="text-muted-foreground">—</span>}
              </Field>
            </div>
          </div>

          {/* NF */}
          {(conta.nf_numero || conta.nf_serie || conta.nf_chave || conta.nf_path) && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  NF / Recibo
                </h3>
                <div className="grid grid-cols-2 gap-4">
                  {conta.nf_numero && <Field label="Número">{conta.nf_numero}</Field>}
                  {conta.nf_serie && <Field label="Série">{conta.nf_serie}</Field>}
                  {conta.nf_chave && (
                    <div className="col-span-2">
                      <Field label="Chave de Acesso">
                        <span className="font-mono text-xs break-all">{conta.nf_chave}</span>
                      </Field>
                    </div>
                  )}
                  {conta.nf_path && (
                    <div className="col-span-2">
                      <Field label="Arquivo">
                        <span className="flex items-center gap-2">
                          <Paperclip className="h-4 w-4 text-primary" />
                          {conta.nf_nome ?? "Arquivo anexado"}
                        </span>
                      </Field>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {/* Observações */}
          {conta.observacoes && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-foreground mb-3">Observações</h3>
                <p className="text-sm text-foreground whitespace-pre-wrap">
                  {conta.observacoes}
                </p>
              </div>
            </>
          )}

          {/* Histórico de status */}
          <Separator />
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-3">
              Histórico de Status
            </h3>
            {historico.length === 0 ? (
              <p className="text-sm text-muted-foreground">Sem alterações registradas.</p>
            ) : (
              <div className="space-y-3">
                {historico.map((h) => (
                  <div
                    key={h.id}
                    className="flex items-start gap-3 text-sm border-l-2 border-border pl-3"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {h.status_anterior && (
                          <>
                            <Badge variant="outline" className="font-normal">
                              {STATUS_LABELS[h.status_anterior as keyof typeof STATUS_LABELS] ??
                                h.status_anterior}
                            </Badge>
                            <span className="text-muted-foreground text-xs">→</span>
                          </>
                        )}
                        <Badge
                          className={
                            STATUS_COLORS[h.status_novo as keyof typeof STATUS_COLORS] ?? ""
                          }
                        >
                          {STATUS_LABELS[h.status_novo as keyof typeof STATUS_LABELS] ??
                            h.status_novo}
                        </Badge>
                      </div>
                      {h.observacao && (
                        <p className="text-xs text-muted-foreground mt-1">{h.observacao}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {formatarDataHora(h.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
