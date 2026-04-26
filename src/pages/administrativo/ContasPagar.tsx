// src/pages/administrativo/ContasPagar.tsx
import { useState } from "react";
import { Plus, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useContasPagar, STATUS_LABELS, STATUS_COLORS } from "@/hooks/useContasPagar";
import { NovaContaSheet } from "@/components/financeiro/NovaContaSheet";
import { AcoesContaMenu } from "@/components/financeiro/AcoesContaMenu";

export default function ContasPagar() {
  const { data: contas = [], isLoading } = useContasPagar();
  const [sheetOpen, setSheetOpen] = useState(false);

  const formatarValor = (valor: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(valor);
  };

  const formatarData = (data: string) => {
    return new Date(data).toLocaleDateString('pt-BR');
  };

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Contas a Pagar</h1>
          <p className="text-gray-500 mt-1">
            Gerencie pagamentos de fornecedores
          </p>
        </div>
        <Button onClick={() => setSheetOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Nova Conta
        </Button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="text-center py-12 text-gray-500">
          Carregando contas...
        </div>
      )}

      {/* Empty State */}
      {!isLoading && contas.length === 0 && (
        <div className="text-center py-12">
          <FileText className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-4">Nenhuma conta cadastrada</p>
          <Button 
            variant="outline"
            onClick={() => setSheetOpen(true)}
          >
            Criar primeira conta
          </Button>
        </div>
      )}

      {/* Tabela */}
      {!isLoading && contas.length > 0 && (
        <div className="bg-white rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fornecedor</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Valor</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-[80px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contas.map((conta) => (
                <TableRow key={conta.id}>
                  <TableCell className="font-medium">
                    {conta.fornecedor}
                  </TableCell>
                  <TableCell className="max-w-[300px] truncate">
                    {conta.descricao}
                  </TableCell>
                  <TableCell>{formatarValor(conta.valor)}</TableCell>
                  <TableCell>{formatarData(conta.vencimento)}</TableCell>
                  <TableCell>
                    <Badge className={STATUS_COLORS[conta.status]}>
                      {STATUS_LABELS[conta.status]}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <AcoesContaMenu conta={conta} />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      {/* Sheet de criação */}
      <NovaContaSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </div>
  );
}
