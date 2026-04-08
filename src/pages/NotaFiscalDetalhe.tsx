import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ArrowLeft, Edit, FileText, Building2, Calendar, DollarSign, Hash, Clock, ExternalLink, Mail, Send, CheckCircle2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Loader2 } from "lucide-react";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";
import { useParametros } from "@/hooks/useParametros";

const defaultStatusMap: Record<string, string> = {
  pendente: "Pendente", aprovada: "Aprovada", enviada_pagamento: "Enviada para Pagamento", paga: "Paga", cancelada: "Cancelada", vencida: "Vencida",
};
const statusStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0",
  aprovada: "bg-info/10 text-info border-0",
  enviada_pagamento: "bg-primary/10 text-primary border-0",
  paga: "bg-success/10 text-success border-0",
  cancelada: "bg-destructive/10 text-destructive border-0",
  vencida: "bg-destructive/10 text-destructive border-0",
};

interface NotaFiscal {
  id: string;
  numero: string;
  serie: string | null;
  valor: number;
  data_emissao: string;
  data_vencimento: string | null;
  data_pagamento: string | null;
  competencia: string;
  descricao: string | null;
  arquivo_url: string | null;
  status: string;
  observacoes: string | null;
  contrato_id: string;
  created_at: string;
  updated_at: string;
}

interface ContratoPJ {
  id: string;
  razao_social: string;
  nome_fantasia: string | null;
  cnpj: string;
  contato_nome: string;
  departamento: string;
  valor_mensal: number;
}

interface PagamentoPJ {
  id: string;
  valor: number;
  competencia: string;
  data_prevista: string;
  data_pagamento: string | null;
  status: string;
  forma_pagamento: string;
  observacoes: string | null;
}

const statusPagMap: Record<string, string> = {
  pendente: "Pendente", pago: "Pago", cancelado: "Cancelado",
};
const statusPagStyles: Record<string, string> = {
  pendente: "bg-warning/10 text-warning border-0",
  pago: "bg-success/10 text-success border-0",
  cancelado: "bg-destructive/10 text-destructive border-0",
};

function InfoItem({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon?: React.ComponentType<{ className?: string }> }) {
  return (
    <div className="space-y-1">
      <p className="text-xs text-muted-foreground flex items-center gap-1.5">
        {Icon && <Icon className="h-3.5 w-3.5" />}
        {label}
      </p>
      <p className="text-sm font-medium">{value || "—"}</p>
    </div>
  );
}

export default function NotaFiscalDetalhe() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [nota, setNota] = useState<NotaFiscal | null>(null);
  const [contrato, setContrato] = useState<ContratoPJ | null>(null);
  const [pagamentos, setPagamentos] = useState<PagamentoPJ[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingStatus, setPendingStatus] = useState<string | null>(null);
  const [changingStatus, setChangingStatus] = useState(false);

  const { data: statusParams } = useParametros("status_nota_fiscal");
  const statusMap = useMemo(() => {
    if (statusParams && statusParams.length > 0) {
      return Object.fromEntries(statusParams.map((p) => [p.valor, p.label]));
    }
    return defaultStatusMap;
  }, [statusParams]);

  useEffect(() => {
    if (!id) return;
    const fetchData = async () => {
      setLoading(true);
      // Fetch nota fiscal
      const { data: nfData, error: nfError } = await supabase
        .from("notas_fiscais_pj")
        .select("*")
        .eq("id", id)
        .single();
      if (nfError || !nfData) {
        toast.error("Nota fiscal não encontrada");
        navigate("/notas-fiscais");
        return;
      }
      setNota(nfData as NotaFiscal);

      // Fetch contrato
      const { data: contratoData } = await supabase
        .from("contratos_pj")
        .select("id, razao_social, nome_fantasia, cnpj, contato_nome, departamento, valor_mensal")
        .eq("id", nfData.contrato_id)
        .single();
      if (contratoData) setContrato(contratoData as ContratoPJ);

      // Fetch pagamentos vinculados
      const { data: pagData } = await supabase
        .from("pagamentos_pj")
        .select("*")
        .eq("nota_fiscal_id", id)
        .order("created_at", { ascending: false });
      if (pagData) setPagamentos(pagData as PagamentoPJ[]);

      setLoading(false);
    };
    fetchData();
  }, [id, navigate]);

  if (loading) {
    return (
      <div className="flex justify-center items-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!nota) return null;

  const formatDate = (d: string | null) => d ? format(parseISO(d), "dd/MM/yyyy") : "—";
  const formatCurrency = (v: number) => `R$ ${Number(v).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" onClick={() => navigate("/notas-fiscais")}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-tight">
                NF {nota.numero}{nota.serie ? `/${nota.serie}` : ""}
              </h1>
              <Badge variant="outline" className={`text-sm ${statusStyles[nota.status] || ""}`}>
                {statusMap[nota.status] || nota.status}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-0.5">
              Competência {nota.competencia} · Emitida em {formatDate(nota.data_emissao)}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            className="gap-2"
            onClick={() => toast.info("Funcionalidade de envio de e-mail será implementada em breve.")}
          >
            <Mail className="h-4 w-4" /> Enviar por E-mail
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => navigate(`/notas-fiscais?edit=${nota.id}`)}>
            <Edit className="h-4 w-4" /> Editar
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <DollarSign className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Valor</p>
                <p className="text-xl font-bold">{formatCurrency(nota.valor)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <Calendar className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Vencimento</p>
                <p className="text-xl font-bold">{formatDate(nota.data_vencimento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10">
                <DollarSign className="h-5 w-5 text-success" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Data Pagamento</p>
                <p className="text-xl font-bold">{formatDate(nota.data_pagamento)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-info/10">
                <Hash className="h-5 w-5 text-info" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">Pagamentos Vinculados</p>
                <p className="text-xl font-bold">{pagamentos.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Dados da NF */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary" />
              Dados da Nota Fiscal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
              <InfoItem label="Número" value={nota.numero} icon={Hash} />
              <InfoItem label="Série" value={nota.serie} />
              <InfoItem label="Competência" value={nota.competencia} icon={Calendar} />
              <InfoItem label="Data de Emissão" value={formatDate(nota.data_emissao)} icon={Calendar} />
              <InfoItem label="Data de Vencimento" value={formatDate(nota.data_vencimento)} icon={Calendar} />
              <InfoItem label="Data de Pagamento" value={formatDate(nota.data_pagamento)} icon={Calendar} />
              <InfoItem label="Valor" value={formatCurrency(nota.valor)} icon={DollarSign} />
              <InfoItem label="Status" value={
                <Badge variant="outline" className={statusStyles[nota.status] || ""}>
                  {statusMap[nota.status] || nota.status}
                </Badge>
              } />
            </div>
            {nota.descricao && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Descrição</p>
                  <p className="text-sm">{nota.descricao}</p>
                </div>
              </>
            )}
            {nota.observacoes && (
              <>
                <Separator className="my-4" />
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Observações</p>
                  <p className="text-sm">{nota.observacoes}</p>
                </div>
              </>
            )}
          </CardContent>
        </Card>

        {/* Contrato vinculado */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Contrato Vinculado
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {contrato ? (
              <>
                <InfoItem label="Razão Social" value={contrato.razao_social} />
                {contrato.nome_fantasia && (
                  <InfoItem label="Nome Fantasia" value={contrato.nome_fantasia} />
                )}
                <InfoItem label="CNPJ" value={contrato.cnpj} />
                <InfoItem label="Contato" value={contrato.contato_nome} />
                <InfoItem label="Departamento" value={contrato.departamento} />
                <InfoItem label="Valor Mensal" value={formatCurrency(contrato.valor_mensal)} />
                <Separator />
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full gap-2"
                  onClick={() => navigate(`/contratos-pj/${contrato.id}`)}
                >
                  <ExternalLink className="h-4 w-4" /> Ver Contrato Completo
                </Button>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">Contrato não encontrado.</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Pagamentos vinculados */}
      {pagamentos.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Pagamentos Vinculados
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pagamentos.map((pag) => (
                <div key={pag.id} className="flex items-center justify-between border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                  <div className="flex items-center gap-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                      <DollarSign className="h-4 w-4 text-primary" />
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {formatCurrency(pag.valor)} · {pag.competencia}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {pag.forma_pagamento} · Previsto: {formatDate(pag.data_prevista)}
                        {pag.data_pagamento && ` · Pago: ${formatDate(pag.data_pagamento)}`}
                      </p>
                    </div>
                  </div>
                  <Badge variant="outline" className={statusPagStyles[pag.status] || ""}>
                    {statusPagMap[pag.status] || pag.status}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            Histórico
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative pl-6 space-y-4">
            <div className="absolute left-2.5 top-1 bottom-1 w-px bg-border" />
            <TimelineItem
              date={nota.created_at}
              label="Nota fiscal cadastrada no sistema"
            />
            {nota.data_emissao && (
              <TimelineItem
                date={nota.data_emissao}
                label={`Emissão da NF ${nota.numero}`}
              />
            )}
            {nota.data_vencimento && (
              <TimelineItem
                date={nota.data_vencimento}
                label="Data de vencimento"
              />
            )}
            {nota.data_pagamento && (
              <TimelineItem
                date={nota.data_pagamento}
                label="Pagamento registrado"
                variant="success"
              />
            )}
            {nota.updated_at !== nota.created_at && (
              <TimelineItem
                date={nota.updated_at}
                label="Última atualização"
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineItem({ date, label, variant = "default" }: { date: string; label: string; variant?: "default" | "success" }) {
  const dotColor = variant === "success" ? "bg-success" : "bg-primary";
  const formatted = date.includes("T") ? format(parseISO(date), "dd/MM/yyyy HH:mm") : format(parseISO(date), "dd/MM/yyyy");
  return (
    <div className="relative flex items-start gap-3">
      <div className={`absolute -left-[14px] top-1.5 h-2.5 w-2.5 rounded-full ${dotColor} ring-2 ring-background`} />
      <div>
        <p className="text-sm">{label}</p>
        <p className="text-xs text-muted-foreground">{formatted}</p>
      </div>
    </div>
  );
}
