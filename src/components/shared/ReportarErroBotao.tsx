import { useState } from "react";
import { MessageSquareWarning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useLocation } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCriarReporte } from "@/hooks/useReportes";

export function ReportarErroBotao() {
  const { user } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);
  const [tipo, setTipo] = useState("bug");
  const [descricao, setDescricao] = useState("");
  const [passos, setPassos] = useState("");
  const criar = useCriarReporte();

  const { data: tipos } = useQuery({
    queryKey: ["parametros", "tipo_reporte"],
    queryFn: async () => {
      const { data } = await supabase
        .from("parametros")
        .select("valor, label")
        .eq("categoria", "tipo_reporte")
        .eq("ativo", true)
        .order("ordem");
      return data || [];
    },
    staleTime: 10 * 60 * 1000,
  });

  if (!user) return null;

  async function handleEnviar() {
    if (descricao.trim().length < 5) return;
    await criar.mutateAsync({
      tipo_valor: tipo,
      descricao,
      passos_reproduzir: passos || undefined,
    });
    setDescricao("");
    setPassos("");
    setTipo("bug");
    setOpen(false);
  }

  return (
    <>
      <Button
        onClick={() => setOpen(true)}
        size="sm"
        variant="outline"
        className="fixed bottom-4 right-4 z-40 shadow-lg gap-1.5 bg-background/95 backdrop-blur hover:bg-accent"
        title="Reportar erro ou sugestão"
      >
        <MessageSquareWarning className="h-4 w-4" />
        Reportar
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquareWarning className="h-5 w-5 text-primary" />
              Reportar algo
            </DialogTitle>
            <DialogDescription>
              Encontrou um bug, viu algo estranho, tem uma ideia? Conta pra gente.
              Na Fetely, usuários também são colaboradores do sistema. 🙌
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label className="text-xs">Tipo *</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {(Array.isArray(tipos) ? tipos : []).map((t: any) => (
                    <SelectItem key={t.valor} value={t.valor}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-xs">O que aconteceu? *</Label>
              <Textarea
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                rows={4}
                placeholder="Ex: Cliquei em 'Salvar' na aba de Benefícios mas a tela ficou em branco e perdi o que digitei..."
              />
              <p className="text-[10px] text-muted-foreground mt-1">
                Mínimo 5 caracteres. Seja específico — nos ajuda a entender rápido.
              </p>
            </div>

            <div>
              <Label className="text-xs">Como reproduzir? (opcional)</Label>
              <Textarea
                value={passos}
                onChange={(e) => setPassos(e.target.value)}
                rows={2}
                placeholder="Ex: 1. Entrei em Pessoas 2. Abri ficha da Maria 3. Cliquei em Editar Benefícios..."
              />
            </div>

            <div className="rounded-md border bg-muted/30 p-3 space-y-1 text-[11px] text-muted-foreground">
              <p>
                <strong>Contexto automático que vai junto:</strong>
              </p>
              <p>
                📍 Rota: <code className="text-foreground">{location.pathname}</code>
              </p>
              <p>🌐 Largura da tela: {window.innerWidth}px</p>
              <p>🧑 Identificação: seu usuário (para poder te responder)</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)} disabled={criar.isPending}>
              Cancelar
            </Button>
            <Button
              onClick={handleEnviar}
              disabled={criar.isPending || descricao.trim().length < 5}
              className="gap-2"
            >
              {criar.isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              Enviar report
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
