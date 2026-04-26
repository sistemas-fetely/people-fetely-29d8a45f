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
import { Pencil, Paperclip, FileText } from "lucide-react";
import {
  STATUS_LABELS,
  STATUS_COLORS,
  useContaHistorico,
  CENTROS_CUSTO,
  UNIDADES_CONTA,
  type ContaPagarComRelacionados,
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

export function DetalheContaSheet({
  open,
  onOpenChange,
  conta,
  onEditar,
}: DetalheContaSheetProps) {
  const { data: historico = [] } = useContaHistorico(open && conta ? conta.id : null);

  if (!conta) return null;

  const nomeParceiro = conta.parceiro?.razao_social || conta.fornecedor;
  const fantasia = conta.parceiro?.nome_fantasia;
  const centroCustoLabel =
    CENTROS_CUSTO.find((c) => c.value === conta.centro_custo)?.label ?? conta.centro_custo;
  const unidadeLabel =
    UNIDADES_CONTA.find((u) => u.value === conta.unidade)?.label ?? conta.unidade;

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
