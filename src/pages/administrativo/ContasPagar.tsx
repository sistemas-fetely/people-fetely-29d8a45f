// src/pages/administrativo/ContasPagar.tsx
import { useState } from "react";
import { Plus, FileText, FileCheck2, Check, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  useContasPagar,
  useAtualizarStatus,
  useUnidades,
  STATUS_LABELS,
  STATUS_COLORS,
  type ContaPagarComRelacionados,
  type ContaPagarStatus,
} from "@/hooks/useContasPagar";
import { NovaContaSheet } from "@/components/financeiro/NovaContaSheet";
import { DetalheContaSheet } from "@/components/financeiro/DetalheContaSheet";
import { AcoesContaMenu } from "@/components/financeiro/AcoesContaMenu";

export default function ContasPagar() {
  const { data: contas = [], isLoading } = useContasPagar();
  const { data: unidades = [] } = useUnidades();
  const atualizarStatus = useAtualizarStatus();
  const [criarOpen, setCriarOpen] = useState(false);
  const [detalheOpen, setDetalheOpen] = useState(false);
  const [editarOpen, setEditarOpen] = useState(false);
  const [contaSelecionada, setContaSelecionada] = useState<ContaPagarComRelacionados | null>(
    null,
  );

  const formatarValor = (valor: number) =>
    new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(valor);

  const formatarData = (data: string | null | undefined) =>
    data ? new Date(data).toLocaleDateString("pt-BR") : "—";

  const handleAbrirDetalhe = (conta: ContaPagarComRelacionados) => {
    setContaSelecionada(conta);
    setDetalheOpen(true);
  };

  const handleAbrirEdicao = (conta: ContaPagarComRelacionados) => {
    setContaSelecionada(conta);
    setDetalheOpen(false);
    setEditarOpen(true);
  };

  const handleAvancarStatus = (
    e: React.MouseEvent,
    contaId: string,
    novoStatus: ContaPagarStatus,
  ) => {
    e.stopPropagation();
    atualizarStatus.mutate({ contaId, novoStatus });
  };

  const renderStatusBadge = (conta: ContaPagarComRelacionados) => (
    <Badge className={STATUS_COLORS[conta.status]}>
      {STATUS_LABELS[conta.status]}
    </Badge>
  );

  const renderAcaoStatus = (conta: ContaPagarComRelacionados) => {
    switch (conta.status) {
      case "rascunho":
        return (
          <Button
            size="sm"
            variant="default"
            className="h-7 px-2 text-xs"
            onClick={(e) => handleAvancarStatus(e, conta.id, "pendente")}
            disabled={atualizarStatus.isPending}
          >
            <ArrowRight className="h-3 w-3 mr-1" />
            Validar
          </Button>
        );
      case "pendente":
        return (
          <Button
            size="sm"
            className="h-7 px-2 text-xs bg-success hover:bg-success/90 text-success-foreground"
            onClick={(e) => handleAvancarStatus(e, conta.id, "aprovado")}
            disabled={atualizarStatus.isPending}
          >
            <Check className="h-3 w-3 mr-1" />
            Aprovar
          </Button>
        );
      default:
        return <span className="text-muted-foreground/50 text-xs">—</span>;
    }
  };

  return (
    <TooltipProvider>
      <div className="space-y-6 p-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Contas a Pagar</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie pagamentos de fornecedores
            </p>
          </div>
          <Button onClick={() => setCriarOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Nova Conta
          </Button>
        </div>

        {isLoading && (
          <div className="text-center py-12 text-muted-foreground">
            Carregando contas...
          </div>
        )}

        {!isLoading && contas.length === 0 && (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground/40 mx-auto mb-4" />
            <p className="text-muted-foreground mb-4">Nenhuma conta cadastrada</p>
            <Button variant="outline" onClick={() => setCriarOpen(true)}>
              Criar primeira conta
            </Button>
          </div>
        )}

        {!isLoading && contas.length > 0 && (
          <div className="bg-card rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Parceiro / Fornecedor</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead>Unidade</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                  <TableHead>Vencimento</TableHead>
                  <TableHead>Forma Pgto</TableHead>
                  <TableHead className="text-center">NF/Recibo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ação</TableHead>
                  <TableHead className="w-[60px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {contas.map((conta) => {
                  const nomeParceiro = conta.parceiro?.razao_social || conta.fornecedor;
                  const fantasia = conta.parceiro?.nome_fantasia;
                  const unidadeNome =
                    unidades.find((u) => u.id === conta.unidade)?.nome ?? null;
                  return (
                    <TableRow
                      key={conta.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => handleAbrirDetalhe(conta)}
                    >
                      <TableCell className="font-medium max-w-[220px]">
                        <div className="truncate text-primary hover:underline">
                          {nomeParceiro}
                        </div>
                        {fantasia && (
                          <div className="text-xs text-muted-foreground truncate">
                            {fantasia}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="max-w-[240px] truncate">
                        {conta.descricao}
                      </TableCell>
                      <TableCell className="max-w-[180px]">
                        {conta.categoria ? (
                          <div className="truncate">
                            <span className="font-mono text-xs text-muted-foreground mr-1">
                              {conta.categoria.codigo}
                            </span>
                            {conta.categoria.nome}
                          </div>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm">
                        {unidadeNome ?? <span className="text-muted-foreground">—</span>}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {formatarValor(conta.valor)}
                      </TableCell>
                      <TableCell>{formatarData(conta.vencimento)}</TableCell>
                      <TableCell>
                        {conta.forma_pagamento ?? (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-center">
                        {conta.nf_path ? (
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-success/10">
                                <FileCheck2 className="h-4 w-4 text-success" />
                              </span>
                            </TooltipTrigger>
                            <TooltipContent>
                              {conta.nf_nome ?? "Anexo disponível"}
                            </TooltipContent>
                          </Tooltip>
                        ) : (
                          <span className="text-xs text-muted-foreground/70">
                            Sem anexo
                          </span>
                        )}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        {renderAcaoStatus(conta)}
                      </TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <AcoesContaMenu
                          conta={conta}
                          onEditar={() => handleAbrirEdicao(conta)}
                        />
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Sheet: criar nova conta */}
        <NovaContaSheet open={criarOpen} onOpenChange={setCriarOpen} />

        {/* Sheet: detalhe (leitura) */}
        <DetalheContaSheet
          open={detalheOpen}
          onOpenChange={setDetalheOpen}
          conta={contaSelecionada}
          onEditar={() => contaSelecionada && handleAbrirEdicao(contaSelecionada)}
        />

        {/* Sheet: editar (reusa o NovaContaSheet em modo edit) */}
        <NovaContaSheet
          open={editarOpen}
          onOpenChange={(open) => {
            setEditarOpen(open);
            if (!open) setContaSelecionada(null);
          }}
          conta={contaSelecionada}
        />
      </div>
    </TooltipProvider>
  );
}
