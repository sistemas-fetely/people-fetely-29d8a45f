import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Eye, EyeOff, Loader2, RefreshCw, CheckCircle2, XCircle, AlertCircle, Settings2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { formatDistanceToNow, format } from "date-fns";
import { ptBR } from "date-fns/locale";

const CALLBACK_URL = "https://people-fetely.lovable.app/administrativo/configuracao-integracao";

export default function ConfiguracaoIntegracao() {
  const qc = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const [showSecret, setShowSecret] = useState(false);
  const [showAccess, setShowAccess] = useState(false);
  const [showRefresh, setShowRefresh] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState<string | null>(null);
  const [syncResult, setSyncResult] = useState<any>(null);
  const [showManualAuth, setShowManualAuth] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [processingCode, setProcessingCode] = useState(false);

  const [form, setForm] = useState({
    client_id: "",
    client_secret: "",
    access_token: "",
    refresh_token: "",
    ativo: false,
  });

  const { data: config, isLoading } = useQuery({
    queryKey: ["integracao-bling"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("integracoes_config")
        .select("*")
        .eq("sistema", "bling")
        .maybeSingle();
      if (error) throw error;
      if (data) {
        setForm({
          client_id: data.client_id || "",
          client_secret: data.client_secret || "",
          access_token: data.access_token || "",
          refresh_token: data.refresh_token || "",
          ativo: data.ativo || false,
        });
      }
      return data;
    },
  });

  const { data: logs = [] } = useQuery({
    queryKey: ["integracao-bling-logs"],
    queryFn: async () => {
      const { data } = await supabase
        .from("integracoes_sync_log")
        .select("*")
        .eq("sistema", "bling")
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    refetchInterval: syncing ? 2000 : false,
  });

  async function salvar() {
    setSaving(true);
    const { error } = await supabase
      .from("integracoes_config")
      .update({
        client_id: form.client_id || null,
        client_secret: form.client_secret || null,
        access_token: form.access_token || null,
        refresh_token: form.refresh_token || null,
        ativo: form.ativo,
        updated_at: new Date().toISOString(),
      })
      .eq("sistema", "bling");
    setSaving(false);
    if (error) {
      toast.error("Erro ao salvar: " + error.message);
      return;
    }
    toast.success("Credenciais salvas");
    qc.invalidateQueries({ queryKey: ["integracao-bling"] });
  }

  async function sincronizar(tipo: "full" | "categorias" | "contas_pagar" | "contas_receber") {
    setSyncing(tipo);
    setSyncResult(null);
    const { data, error } = await supabase.functions.invoke("sync-bling-financeiro", {
      body: { tipo },
    });
    setSyncing(null);
    if (error) {
      toast.error("Falha: " + error.message);
      return;
    }
    if (data?.sucesso === false) {
      toast.error(data.erro || "Erro desconhecido");
      return;
    }
    setSyncResult(data);
    toast.success(`Sync concluída: ${data?.criados || 0} novos, ${data?.atualizados || 0} atualizados`);
    qc.invalidateQueries({ queryKey: ["integracao-bling"] });
    qc.invalidateQueries({ queryKey: ["integracao-bling-logs"] });
  }

  function autorizarBling() {
    if (!form.client_id) {
      toast.error("Cadastre o Client ID antes de autorizar");
      return;
    }
    salvar().then(() => {
      const url = new URL("https://www.bling.com.br/Api/v3/oauth/authorize");
      url.searchParams.set("response_type", "code");
      url.searchParams.set("client_id", form.client_id);
      url.searchParams.set("redirect_uri", CALLBACK_URL);
      url.searchParams.set("state", "manual");
      navigator.clipboard.writeText(url.toString()).catch(() => {});
      toast.info(
        "Link copiado! Cole em uma nova aba, autorize no Bling, e copie o código da URL de retorno.",
      );
      setShowManualAuth(true);
    });
  }

  async function processarCodeManual() {
    setProcessingCode(true);
    try {
      const code = manualCode.trim();
      if (!code) throw new Error("Cole o código de autorização");

      const { data: cfg, error: cfgErr } = await supabase
        .from("integracoes_config")
        .select("client_id, client_secret")
        .eq("sistema", "bling")
        .maybeSingle();

      if (cfgErr) throw cfgErr;
      if (!cfg?.client_id || !cfg?.client_secret) {
        throw new Error("Credenciais não cadastradas");
      }

      const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
          Accept: "application/json",
          Authorization: "Basic " + btoa(`${cfg.client_id}:${cfg.client_secret}`),
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: CALLBACK_URL,
        }),
      });

      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Bling rejeitou: ${res.status} — ${text}`);
      }

      const tokens = await res.json();

      const { error: upErr } = await supabase
        .from("integracoes_config")
        .update({
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          token_expires_at: new Date(
            Date.now() + (tokens.expires_in || 3600) * 1000,
          ).toISOString(),
          ativo: true,
          updated_at: new Date().toISOString(),
        })
        .eq("sistema", "bling");

      if (upErr) throw upErr;

      toast.success("Bling conectado com sucesso!");
      setShowManualAuth(false);
      setManualCode("");
      setForm((f) => ({
        ...f,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        ativo: true,
      }));
      qc.invalidateQueries({ queryKey: ["integracao-bling"] });
    } catch (e: any) {
      toast.error("Erro: " + (e?.message || String(e)));
    } finally {
      setProcessingCode(false);
    }
  }

  // Processar retorno do OAuth Bling (?code=...&state=...)
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    const erroParam = searchParams.get("error");

    if (!code && !erroParam) return;

    // Limpar params imediatamente para evitar reprocessamento
    setSearchParams({}, { replace: true });

    (async () => {
      try {
        if (erroParam) throw new Error(`Bling negou: ${erroParam}`);
        if (!code) throw new Error("Code não recebido");

        const expectedState = sessionStorage.getItem("bling_oauth_state");
        if (state && expectedState && state !== expectedState) {
          throw new Error("State inválido (possível ataque CSRF)");
        }
        sessionStorage.removeItem("bling_oauth_state");

        const { data: cfg, error: cfgErr } = await supabase
          .from("integracoes_config")
          .select("client_id, client_secret")
          .eq("sistema", "bling")
          .maybeSingle();

        if (cfgErr) throw cfgErr;
        if (!cfg?.client_id || !cfg?.client_secret) {
          throw new Error("Client ID/Secret não cadastrados");
        }

        const res = await fetch("https://www.bling.com.br/Api/v3/oauth/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Accept: "application/json",
            Authorization: "Basic " + btoa(`${cfg.client_id}:${cfg.client_secret}`),
          },
          body: new URLSearchParams({
            grant_type: "authorization_code",
            code,
            redirect_uri: CALLBACK_URL,
          }),
        });

        if (!res.ok) {
          const text = await res.text();
          throw new Error(`Bling rejeitou: ${res.status} ${text}`);
        }

        const tokens = await res.json();

        const { error: upErr } = await supabase
          .from("integracoes_config")
          .update({
            access_token: tokens.access_token,
            refresh_token: tokens.refresh_token,
            token_expires_at: new Date(
              Date.now() + (tokens.expires_in || 3600) * 1000,
            ).toISOString(),
            ativo: true,
            updated_at: new Date().toISOString(),
          })
          .eq("sistema", "bling");

        if (upErr) throw upErr;

        toast.success("Bling conectado com sucesso!");
        qc.invalidateQueries({ queryKey: ["integracao-bling"] });
      } catch (e: any) {
        toast.error("Falha na autorização: " + (e?.message || String(e)));
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusBadge = () => {
    if (!config?.ativo) return <Badge variant="outline">Desconectado</Badge>;
    if (config.ultima_sync_status === "erro") return <Badge variant="destructive">Erro</Badge>;
    if (config.ultima_sync_status === "parcial")
      return <Badge className="bg-amber-500 hover:bg-amber-500">Parcial</Badge>;
    return <Badge className="bg-emerald-600 hover:bg-emerald-600">Conectado</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-admin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Settings2 className="h-6 w-6 text-admin" />
            Configuração da Integração
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Conecte o Sistema Financeiro Fetely à API do Bling.
          </p>
        </div>
        {statusBadge()}
      </div>

      {/* Credenciais */}
      <Card>
        <CardHeader>
          <CardTitle>Credenciais Bling</CardTitle>
          <CardDescription>
            Cadastre o app no portal do Bling e cole as chaves abaixo.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Client ID</Label>
              <Input
                value={form.client_id}
                onChange={(e) => setForm({ ...form, client_id: e.target.value })}
                placeholder="ex: abcd1234..."
              />
            </div>
            <div>
              <Label>Client Secret</Label>
              <div className="relative">
                <Input
                  type={showSecret ? "text" : "password"}
                  value={form.client_secret}
                  onChange={(e) => setForm({ ...form, client_secret: e.target.value })}
                  placeholder="••••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowSecret((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Access Token</Label>
              <div className="relative">
                <Input
                  type={showAccess ? "text" : "password"}
                  value={form.access_token}
                  onChange={(e) => setForm({ ...form, access_token: e.target.value })}
                  placeholder="Gerado após autorização OAuth"
                />
                <button
                  type="button"
                  onClick={() => setShowAccess((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showAccess ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
            <div>
              <Label>Refresh Token</Label>
              <div className="relative">
                <Input
                  type={showRefresh ? "text" : "password"}
                  value={form.refresh_token}
                  onChange={(e) => setForm({ ...form, refresh_token: e.target.value })}
                  placeholder="Gerado após autorização OAuth"
                />
                <button
                  type="button"
                  onClick={() => setShowRefresh((s) => !s)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                >
                  {showRefresh ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 p-3 rounded-lg border bg-muted/30">
            <Switch
              checked={form.ativo}
              onCheckedChange={(v) => setForm({ ...form, ativo: v })}
            />
            <Label className="cursor-pointer">Integração ativa</Label>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button onClick={salvar} disabled={saving} className="bg-admin hover:bg-admin/90 text-admin-foreground">
              {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Salvar credenciais
            </Button>
            <Button variant="outline" onClick={autorizarBling} disabled={!form.client_id}>
              <ExternalLink className="h-4 w-4 mr-2" />
              Autorizar no Bling
            </Button>
            <Button
              variant="outline"
              onClick={() => sincronizar("categorias")}
              disabled={!!syncing || !form.access_token}
            >
              {syncing === "categorias" ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4 mr-2" />
              )}
              Testar conexão
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Sincronização */}
      <Card>
        <CardHeader>
          <CardTitle>Sincronização</CardTitle>
          <CardDescription>
            {config?.ultima_sync_at
              ? `Última sincronização ${formatDistanceToNow(new Date(config.ultima_sync_at), { addSuffix: true, locale: ptBR })}`
              : "Nunca sincronizado"}
            {config?.ultima_sync_detalhes && (
              <span className="block mt-1 text-xs">{config.ultima_sync_detalhes}</span>
            )}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button
              size="lg"
              className="bg-admin hover:bg-admin/90 text-admin-foreground"
              onClick={() => sincronizar("full")}
              disabled={!!syncing || !form.access_token}
            >
              {syncing === "full" ? (
                <Loader2 className="h-5 w-5 mr-2 animate-spin" />
              ) : (
                <RefreshCw className="h-5 w-5 mr-2" />
              )}
              Sincronizar tudo
            </Button>
            <Button
              variant="outline"
              onClick={() => sincronizar("categorias")}
              disabled={!!syncing || !form.access_token}
            >
              Só categorias
            </Button>
            <Button
              variant="outline"
              onClick={() => sincronizar("contas_pagar")}
              disabled={!!syncing || !form.access_token}
            >
              Só contas a pagar
            </Button>
            <Button
              variant="outline"
              onClick={() => sincronizar("contas_receber")}
              disabled={!!syncing || !form.access_token}
            >
              Só contas a receber
            </Button>
          </div>

          {syncResult && (
            <div className="p-4 rounded-lg border bg-emerald-50 dark:bg-emerald-950/30 text-sm">
              <div className="font-medium text-emerald-900 dark:text-emerald-200 mb-1">
                ✅ Sincronização concluída
              </div>
              <div className="text-emerald-800 dark:text-emerald-300">
                {syncResult.criados} novos | {syncResult.atualizados} atualizados |{" "}
                {syncResult.erros} erros | {syncResult.duracao_ms}ms
              </div>
              {syncResult.detalhes && (
                <div className="text-xs text-emerald-700 dark:text-emerald-400 mt-1">
                  {syncResult.detalhes}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Histórico */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico de sincronizações</CardTitle>
          <CardDescription>Últimas 20 execuções</CardDescription>
        </CardHeader>
        <CardContent>
          {logs.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Nenhuma sincronização registrada ainda.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Criados</TableHead>
                  <TableHead className="text-right">Atualizados</TableHead>
                  <TableHead className="text-right">Erros</TableHead>
                  <TableHead className="text-right">Duração</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {logs.map((l: any) => (
                  <TableRow key={l.id}>
                    <TableCell className="text-xs">
                      {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                    </TableCell>
                    <TableCell className="text-xs">{l.tipo}</TableCell>
                    <TableCell>
                      {l.status === "sucesso" && (
                        <Badge className="bg-emerald-600 hover:bg-emerald-600">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Sucesso
                        </Badge>
                      )}
                      {l.status === "erro" && (
                        <Badge variant="destructive">
                          <XCircle className="h-3 w-3 mr-1" /> Erro
                        </Badge>
                      )}
                      {l.status === "parcial" && (
                        <Badge className="bg-amber-500 hover:bg-amber-500">
                          <AlertCircle className="h-3 w-3 mr-1" /> Parcial
                        </Badge>
                      )}
                      {l.status === "executando" && (
                        <Badge variant="outline">
                          <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Executando
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right text-xs">{l.registros_criados ?? 0}</TableCell>
                    <TableCell className="text-right text-xs">{l.registros_atualizados ?? 0}</TableCell>
                    <TableCell className="text-right text-xs">{l.registros_erro ?? 0}</TableCell>
                    <TableCell className="text-right text-xs">
                      {l.duracao_ms ? `${l.duracao_ms}ms` : "-"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Como configurar */}
      <Accordion type="single" collapsible>
        <AccordionItem value="how">
          <AccordionTrigger className="text-sm font-medium">
            Como configurar a integração
          </AccordionTrigger>
          <AccordionContent className="text-sm text-muted-foreground space-y-2">
            <ol className="list-decimal list-inside space-y-1.5">
              <li>Acesse o portal do Bling → Configurações → API → Aplicativos</li>
              <li>Crie um novo aplicativo com nome "Fetely Uauuu"</li>
              <li>
                URL de callback:{" "}
                <code className="bg-muted px-1.5 py-0.5 rounded text-xs">
                  {CALLBACK_URL}
                </code>
              </li>
              <li>Copie Client ID e Client Secret nos campos acima e salve</li>
              <li>Clique em "Autorizar no Bling" para gerar os tokens</li>
              <li>Teste a conexão e sincronize os dados</li>
            </ol>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}
