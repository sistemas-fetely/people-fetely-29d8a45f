import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Plus,
  Landmark,
  CreditCard,
  PiggyBank,
  Banknote,
  Pencil,
  Trash2,
  Power,
} from "lucide-react";
import { formatBRL } from "@/lib/format-currency";
import {
  ContaBancariaFormSheet,
  type ContaBancaria,
} from "@/components/financeiro/ContaBancariaFormSheet";

const TIPO_LABEL: Record<string, string> = {
  corrente: "Conta Corrente",
  poupanca: "Poupança",
  cartao_credito: "Cartão de Crédito",
  caixa_fisico: "Caixa Físico",
};

const TIPO_ICON: Record<string, typeof Landmark> = {
  corrente: Landmark,
  poupanca: PiggyBank,
  cartao_credito: CreditCard,
  caixa_fisico: Banknote,
};

const UNIDADE_LABEL: Record<string, string> = {
  matriz_sp: "Matriz SP",
  joinville: "Joinville",
  fabrica_sp: "Fábrica SP",
  ecommerce_sp: "Ecommerce SP",
};

export default function ContasBancarias() {
  const qc = useQueryClient();
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<ContaBancaria | null>(null);
  const [paraExcluir, setParaExcluir] = useState<ContaBancaria | null>(null);

  const { data: contas, isLoading } = useQuery({
    queryKey: ["contas-bancarias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("contas_bancarias")
        .select("*")
        .order("ativo", { ascending: false })
        .order("nome_exibicao");
      if (error) throw error;
      return data as ContaBancaria[];
    },
  });

  function handleNova() {
    setEditing(null);
    setFormOpen(true);
  }

  function handleEditar(c: ContaBancaria) {
    setEditing(c);
    setFormOpen(true);
  }

  async function handleToggleAtivo(c: ContaBancaria) {
    const { error } = await supabase
      .from("contas_bancarias")
      .update({ ativo: !c.ativo })
      .eq("id", c.id);
    if (error) {
      toast.error("Erro ao atualizar: " + error.message);
      return;
    }
    toast.success(c.ativo ? "Conta inativada" : "Conta ativada");
    qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
  }

  async function handleConfirmarExcluir() {
    if (!paraExcluir) return;
    // Verificar se tem movimentações
    const { count } = await supabase
      .from("movimentacoes_bancarias")
      .select("id", { count: "exact", head: true })
      .eq("conta_bancaria_id", paraExcluir.id);

    if (count && count > 0) {
      // Tem movimentações - inativa
      const { error } = await supabase
        .from("contas_bancarias")
        .update({ ativo: false })
        .eq("id", paraExcluir.id);
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      toast.success(`Conta inativada (tem ${count} movimentações - não pode ser excluída)`);
    } else {
      const { error } = await supabase
        .from("contas_bancarias")
        .delete()
        .eq("id", paraExcluir.id);
      if (error) {
        toast.error("Erro: " + error.message);
        return;
      }
      toast.success("Conta excluída");
    }
    qc.invalidateQueries({ queryKey: ["contas-bancarias"] });
    setParaExcluir(null);
  }

  const ativas = (contas || []).filter((c) => c.ativo !== false);
  const inativas = (contas || []).filter((c) => c.ativo === false);

  const totalSaldo = ativas
    .filter((c) => c.tipo !== "cartao_credito")
    .reduce((s, c) => s + Number(c.saldo_atual || 0), 0);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Landmark className="h-6 w-6 text-admin" />
            Contas Bancárias
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Cadastro de contas correntes, poupanças, cartões de crédito e caixas físicos.
          </p>
        </div>
        <Button
          onClick={handleNova}
          className="gap-2 bg-admin hover:bg-admin-accent text-admin-foreground"
        >
          <Plus className="h-4 w-4" />
          Nova conta bancária
        </Button>
      </div>

      {/* Saldo total */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Saldo total (contas ativas)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-admin">{formatBRL(totalSaldo)}</div>
            <p className="text-[10px] text-muted-foreground mt-1">
              Não inclui cartões de crédito.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Contas ativas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{ativas.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Cartões de crédito
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {ativas.filter((c) => c.tipo === "cartao_credito").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de contas ativas */}
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : ativas.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Landmark className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">
              Nenhuma conta bancária cadastrada ainda.
            </p>
            <Button onClick={handleNova} className="mt-4 gap-2">
              <Plus className="h-4 w-4" />
              Cadastrar primeira conta
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {ativas.map((c) => {
            const Icon = TIPO_ICON[c.tipo] || Landmark;
            const isCartao = c.tipo === "cartao_credito";
            return (
              <Card
                key={c.id}
                className="relative overflow-hidden transition-all hover:shadow-md"
                style={{ borderLeft: `4px solid ${c.cor || "#1A3D2B"}` }}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <div
                        className="p-2 rounded-md"
                        style={{ backgroundColor: `${c.cor || "#1A3D2B"}20` }}
                      >
                        <Icon className="h-4 w-4" style={{ color: c.cor || "#1A3D2B" }} />
                      </div>
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{c.nome_exibicao}</CardTitle>
                        <p className="text-[11px] text-muted-foreground truncate">
                          {TIPO_LABEL[c.tipo] || c.tipo}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => handleEditar(c)}
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-amber-700 hover:text-amber-700 hover:bg-amber-50"
                        onClick={() => handleToggleAtivo(c)}
                        title="Inativar"
                      >
                        <Power className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => setParaExcluir(c)}
                        title="Excluir"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2">
                  {/* Banco e dados */}
                  {c.tipo !== "caixa_fisico" && (
                    <div className="text-xs text-muted-foreground space-y-0.5">
                      <p>{c.banco}</p>
                      {c.tipo !== "cartao_credito" && (c.agencia || c.numero_conta) && (
                        <p className="font-mono">
                          {c.agencia ? `Ag ${c.agencia}` : ""}
                          {c.agencia && c.numero_conta ? " · " : ""}
                          {c.numero_conta ? `C/C ${c.numero_conta}` : ""}
                        </p>
                      )}
                      {c.tipo === "cartao_credito" && c.numero_conta && (
                        <p className="font-mono">Final {c.numero_conta}</p>
                      )}
                    </div>
                  )}

                  {/* Saldo ou limite */}
                  <div className="pt-2 border-t">
                    {isCartao ? (
                      <>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Limite
                        </p>
                        <p className="text-lg font-bold">
                          {formatBRL(Number(c.limite_credito || 0))}
                        </p>
                        {c.dia_fechamento && c.dia_vencimento && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            Fecha dia {c.dia_fechamento} · Vence dia {c.dia_vencimento}
                          </p>
                        )}
                      </>
                    ) : (
                      <>
                        <p className="text-[10px] text-muted-foreground uppercase tracking-wide">
                          Saldo atual
                        </p>
                        <p
                          className={`text-lg font-bold ${
                            Number(c.saldo_atual || 0) < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {formatBRL(Number(c.saldo_atual || 0))}
                        </p>
                      </>
                    )}
                  </div>

                  {/* Unidade */}
                  {c.unidade && (
                    <Badge variant="outline" className="text-[10px]">
                      {UNIDADE_LABEL[c.unidade] || c.unidade}
                    </Badge>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Inativas (collapsed) */}
      {inativas.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-normal text-muted-foreground">
              Contas inativas ({inativas.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            {inativas.map((c) => (
              <div
                key={c.id}
                className="flex items-center justify-between p-2 rounded hover:bg-muted/50 text-sm"
              >
                <div className="flex items-center gap-2 text-muted-foreground">
                  <span>{c.nome_exibicao}</span>
                  <span className="text-[10px]">·</span>
                  <span className="text-[10px]">{TIPO_LABEL[c.tipo] || c.tipo}</span>
                </div>
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => handleToggleAtivo(c)}
                  >
                    Ativar
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-destructive"
                    onClick={() => setParaExcluir(c)}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <ContaBancariaFormSheet
        open={formOpen}
        onOpenChange={setFormOpen}
        editing={editing}
      />

      <AlertDialog open={!!paraExcluir} onOpenChange={(v) => !v && setParaExcluir(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir conta bancária?</AlertDialogTitle>
            <AlertDialogDescription>
              Você está prestes a excluir <strong>{paraExcluir?.nome_exibicao}</strong>.
              <br /><br />
              Se houver movimentações vinculadas, ela será apenas <strong>inativada</strong>{" "}
              (não pode ser excluída para preservar o histórico).
              <br /><br />
              Caso contrário, será excluída permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => {
                e.preventDefault();
                handleConfirmarExcluir();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Confirmar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
