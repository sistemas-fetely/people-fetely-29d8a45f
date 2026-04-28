import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Loader2, Settings2, Upload } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useCategoriasPlano } from "@/hooks/useCategoriasPlano";
import { ImportadorCsvQive } from "@/components/financeiro/ImportadorCsvQive";
import { ImportadorXmlNFe } from "@/components/financeiro/ImportadorXmlNFe";
import { ImportadorPdfDanfe } from "@/components/financeiro/ImportadorPdfDanfe";

export default function ImportarDados() {
  const [syncing, setSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<any>(null);
  const { data: categorias = [] } = useCategoriasPlano();

  const { data: config, refetch } = useQuery({
    queryKey: ["integracao-bling-status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integracoes_config")
        .select("ativo, ultima_sync_at, ultima_sync_status, access_token")
        .eq("sistema", "bling")
        .maybeSingle();
      return data;
    },
  });

  const integracaoAtiva = !!(config?.ativo && config?.access_token);

  async function sync() {
    setSyncing(true);
    setSyncResult(null);
    try {
      const tipos = ["contas_receber", "pedidos", "produtos"] as const;
      const totals = { criados: 0, atualizados: 0, duracao_ms: 0 };
      for (const tipo of tipos) {
        const { data, error } = await supabase.functions.invoke(
          "sync-bling-financeiro",
          { body: { tipo } }
        );
        if (error) throw new Error(error.message);
        if (data?.sucesso === false) throw new Error(data.erro || `Erro em ${tipo}`);
        totals.criados += data?.criados || 0;
        totals.atualizados += data?.atualizados || 0;
        totals.duracao_ms += data?.duracao_ms || 0;
      }
      setSyncResult(totals);
      toast.success("Sincronização concluída");
      refetch();
    } catch (e: any) {
      toast.error("Falha: " + (e.message || e));
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
          <Upload className="h-6 w-6 text-admin" />
          Importar Dados
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Sincronize com o Bling ou importe NFs por CSV (Qive), XML ou PDF.
        </p>
      </div>

      {/* Card destaque integração Bling */}
      <Card className="border-admin/40 bg-admin/5">
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="flex-1 min-w-[280px]">
              <CardTitle className="flex items-center gap-2 text-admin">
                <RefreshCw className="h-5 w-5" />
                Sincronizar com Bling
              </CardTitle>
              <CardDescription className="mt-1">
                Importa contas a receber, pedidos de venda e produtos do Bling.
                {config?.ultima_sync_at && (
                  <span className="block mt-1">
                    Última sync:{" "}
                    {formatDistanceToNow(new Date(config.ultima_sync_at), {
                      locale: ptBR,
                      addSuffix: true,
                    })}
                  </span>
                )}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Badge
                variant={integracaoAtiva ? "default" : "outline"}
                className={
                  integracaoAtiva ? "bg-success hover:bg-success text-success-foreground" : ""
                }
              >
                {integracaoAtiva ? "Conectado" : "Desconectado"}
              </Badge>
              <Button
                onClick={sync}
                disabled={syncing || !integracaoAtiva}
                className="bg-admin hover:bg-admin/90 text-admin-foreground"
              >
                {syncing ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4 mr-2" />
                )}
                {syncing ? "Sincronizando..." : "Sincronizar agora"}
              </Button>
            </div>
          </div>

          {!integracaoAtiva && (
            <Link
              to="/administrativo/configuracao-integracao"
              className="inline-flex items-center gap-1.5 text-sm text-admin hover:underline mt-3"
            >
              <Settings2 className="h-3.5 w-3.5" />
              Configure a integração com o Bling →
            </Link>
          )}

          {syncResult && (
            <div className="mt-3 p-3 rounded-md bg-success/10 text-sm text-success">
              ✅ {syncResult.criados} novos | 🔄 {syncResult.atualizados} atualizados | ⏱{" "}
              {syncResult.duracao_ms}ms
            </div>
          )}
        </CardContent>
      </Card>

      {/* Importadores de NF */}
      <div>
        <h2 className="text-lg font-semibold mb-1">Importar NFs</h2>
        <p className="text-sm text-muted-foreground mb-3">
          Importação no repositório fiscal. XML cobre NF-e (produto) e NFS-e ABRASF (serviço).
          Recibos virão como próximo formato suportado.
        </p>
        <div className="grid gap-4 md:grid-cols-1">
          {/* CSV Qive ocultado — código preservado pra reativar quando necessário */}
          {/* <ImportadorCsvQive categorias={categorias} /> */}
          <ImportadorXmlNFe categorias={categorias} />
          <ImportadorPdfDanfe categorias={categorias} />
        </div>
      </div>
    </div>
  );
}
