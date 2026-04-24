import { useEffect, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const CALLBACK_URL = "https://people-fetely.lovable.app/administrativo/bling-callback";

export default function BlingCallback() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const code = params.get("code");
    const state = params.get("state");
    const erroParam = params.get("error");

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
            Authorization:
              "Basic " + btoa(`${cfg.client_id}:${cfg.client_secret}`),
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
      } catch (e: any) {
        toast.error("Falha na autorização: " + (e?.message || String(e)));
      } finally {
        navigate("/administrativo/configuracao-integracao", { replace: true });
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <Loader2 className="h-8 w-8 animate-spin text-admin" />
      <p className="text-sm text-muted-foreground">Conectando com o Bling…</p>
    </div>
  );
}
