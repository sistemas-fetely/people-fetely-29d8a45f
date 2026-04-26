import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertTriangle, FileX, CheckCircle2 } from "lucide-react";
import { formatBRL, formatDateBR } from "@/lib/format-currency";

type ContaPendente = {
  id: string;
  fornecedor_cliente: string | null;
  valor: number;
  data_pagamento: string | null;
  data_vencimento: string;
  nf_numero: string | null;
  nf_pdf_url: string | null;
  parceiros_comerciais: { razao_social: string | null } | null;
};

export default function RadarPendencias() {
  const { data: pendencias, isLoading } = useQuery({
    queryKey: ["radar-pendencias"],
    queryFn: async () => {
      // Contas pagas SEM PDF de NF anexado
      const { data, error } = await supabase
        .from("contas_pagar_receber")
        .select(`
          id, fornecedor_cliente, valor, data_pagamento, data_vencimento,
          nf_numero, nf_pdf_url,
          parceiros_comerciais ( razao_social )
        `)
        .eq("status", "pago")
        .is("nf_pdf_url", null)
        .order("data_pagamento", { ascending: false });

      if (error) throw error;
      return (data || []) as unknown as ContaPendente[];
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <AlertTriangle className="h-6 w-6 text-warning" />
        <div>
          <h1 className="text-2xl font-semibold">Radar de Pendências</h1>
          <p className="text-sm text-muted-foreground">
            Contas pagas que ainda precisam de documento (NF, Invoice ou Recibo).
          </p>
        </div>
        {pendencias && pendencias.length > 0 && (
          <Badge variant="destructive" className="ml-2">
            {pendencias.length}
          </Badge>
        )}
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Carregando...
          </CardContent>
        </Card>
      ) : pendencias && pendencias.length > 0 ? (
        <div className="grid gap-3">
          {pendencias.map((conta) => {
            const fornecedor =
              conta.fornecedor_cliente ||
              conta.parceiros_comerciais?.razao_social ||
              "Sem fornecedor";

            return (
              <Card key={conta.id} className="border-warning/40">
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <FileX className="h-5 w-5 text-warning" />
                    {fornecedor}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm">
                    <div>
                      <span className="text-muted-foreground block">Valor</span>
                      <span className="font-mono font-semibold text-admin">
                        {formatBRL(conta.valor)}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">Pago em</span>
                      <span>{formatDateBR(conta.data_pagamento)}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground block">NF</span>
                      <Badge variant={conta.nf_numero ? "secondary" : "outline"}>
                        {conta.nf_numero || "SEM NF"}
                      </Badge>
                    </div>
                  </div>

                  <div className="rounded-md bg-warning/10 border border-warning/30 px-3 py-2 text-xs text-warning-foreground">
                    ⚠️ Pendente: anexar documento (NF, Invoice ou Recibo).
                  </div>

                  <Button asChild size="sm" variant="default">
                    <Link to={`/administrativo/contas-pagar?id=${conta.id}`}>
                      Resolver pendência
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card>
          <CardContent className="py-10 text-center">
            <CheckCircle2 className="h-10 w-10 text-success mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              Nenhuma pendência no momento. Todas as contas pagas têm documento anexado. 🎉
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
