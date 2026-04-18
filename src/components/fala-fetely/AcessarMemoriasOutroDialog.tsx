import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const MOTIVOS = [
  { value: "auditoria_lgpd", label: "Auditoria LGPD" },
  { value: "investigacao_incidente", label: "Investigação de incidente" },
  { value: "suporte_usuario", label: "Suporte ao usuário" },
  { value: "solicitacao_titular", label: "Solicitação do titular" },
  { value: "outro", label: "Outro" },
];

interface Memoria {
  id: string;
  resumo: string;
  conteudo_completo: string | null;
  tipo: string;
  ativo: boolean;
  created_at: string;
  user_id: string;
}

interface UsuarioOpcao {
  user_id: string;
  full_name: string | null;
  email?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onAcessoAprovado: (memorias: Memoria[], titular: UsuarioOpcao) => void;
}

export function AcessarMemoriasOutroDialog({ open, onOpenChange, onAcessoAprovado }: Props) {
  const [usuarios, setUsuarios] = useState<UsuarioOpcao[]>([]);
  const [usuarioAlvo, setUsuarioAlvo] = useState("");
  const [motivo, setMotivo] = useState("");
  const [justificativa, setJustificativa] = useState("");
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(false);
  const [processando, setProcessando] = useState(false);

  useEffect(() => {
    if (!open) {
      setUsuarioAlvo("");
      setMotivo("");
      setJustificativa("");
      return;
    }
    let cancelled = false;
    (async () => {
      setCarregandoUsuarios(true);
      const { data } = await supabase
        .from("profiles")
        .select("user_id, full_name")
        .order("full_name", { ascending: true });
      if (cancelled) return;
      setUsuarios((data ?? []).filter((u): u is UsuarioOpcao => !!u.user_id));
      setCarregandoUsuarios(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const titularSelecionado = useMemo(
    () => usuarios.find((u) => u.user_id === usuarioAlvo) ?? null,
    [usuarios, usuarioAlvo]
  );

  const podeConfirmar =
    !!usuarioAlvo && !!motivo && justificativa.trim().length >= 30 && !processando;

  async function confirmar() {
    if (!podeConfirmar || !titularSelecionado) return;
    setProcessando(true);
    try {
      const motivoLabel = MOTIVOS.find((m) => m.value === motivo)?.label ?? motivo;
      const contexto = `${motivoLabel}: ${justificativa.trim()}`;

      // 1. Log de acesso a dado pessoal (visível ao titular)
      const { error: errAcesso } = await supabase.rpc("registrar_acesso_dado", {
        _alvo_user_id: usuarioAlvo,
        _tipo_dado: "memoria_fala_fetely",
        _tabela_origem: "fala_fetely_memoria",
        _contexto: contexto,
      });
      if (errAcesso) throw errAcesso;

      // 2. Audit log formal (rastreabilidade dupla)
      const { error: errAudit } = await supabase.rpc("registrar_audit", {
        _acao: "ACESSO_MEMORIAS_TERCEIROS",
        _tabela: "fala_fetely_memoria",
        _registro_id: usuarioAlvo,
        _justificativa: contexto,
      });
      if (errAudit) throw errAudit;

      // 3. Buscar memórias
      const { data, error } = await supabase
        .from("fala_fetely_memoria")
        .select("id, resumo, conteudo_completo, tipo, ativo, created_at, user_id")
        .eq("user_id", usuarioAlvo)
        .order("created_at", { ascending: false });
      if (error) throw error;

      onAcessoAprovado((data ?? []) as Memoria[], titularSelecionado);
      onOpenChange(false);
      toast({
        title: "Acesso registrado 🔐",
        description: "O titular foi notificado via log de auditoria.",
      });
    } catch (e) {
      toast({
        title: "Erro ao registrar acesso",
        description: e instanceof Error ? e.message : "Erro inesperado",
        variant: "destructive",
      });
    } finally {
      setProcessando(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !processando && onOpenChange(v)}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>🔐 Acesso a memórias de outro usuário</DialogTitle>
          <DialogDescription>
            Memórias são dados pessoais protegidos pela LGPD. Esse acesso será registrado no audit log
            com sua justificativa — tanto você quanto o titular dos dados terão visibilidade desse acesso.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label>Usuário titular das memórias *</Label>
            <Select value={usuarioAlvo} onValueChange={setUsuarioAlvo} disabled={carregandoUsuarios}>
              <SelectTrigger>
                <SelectValue placeholder={carregandoUsuarios ? "Carregando..." : "Selecione o usuário"} />
              </SelectTrigger>
              <SelectContent className="max-h-72">
                {usuarios.map((u) => (
                  <SelectItem key={u.user_id} value={u.user_id}>
                    {u.full_name || u.user_id}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Motivo do acesso *</Label>
            <Select value={motivo} onValueChange={setMotivo}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o motivo" />
              </SelectTrigger>
              <SelectContent>
                {MOTIVOS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>
              Justificativa detalhada *{" "}
              <span className="text-xs text-muted-foreground font-normal">
                (mínimo 30 caracteres — {justificativa.trim().length}/30)
              </span>
            </Label>
            <Textarea
              value={justificativa}
              onChange={(e) => setJustificativa(e.target.value)}
              placeholder="Explique por que esse acesso é necessário. Essa justificativa fica no audit log permanentemente."
              rows={4}
              maxLength={500}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processando}>
            Cancelar
          </Button>
          <Button onClick={() => void confirmar()} disabled={!podeConfirmar}>
            {processando && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
            Registrar e acessar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
