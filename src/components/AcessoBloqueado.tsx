import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type TipoBloqueio = "sem-permissao" | "restrito-sensivel" | "restrito-c-level" | "retencao-legal";

interface Props {
  tipo?: TipoBloqueio;
  motivo?: string;
  sugestao?: string;
  onVoltar?: () => void;
  onCta?: () => void;
}

const CONFIG: Record<TipoBloqueio, { emoji: string; titulo: string; texto: string; ctaPadrao?: string }> = {
  "sem-permissao": {
    emoji: "🌷",
    titulo: "Essa parte não está no seu acesso por enquanto",
    texto:
      "Seu perfil não tem permissão para ver essa área. Pode ser que faça sentido ter — se for o caso, vale uma conversa com seu gestor ou com o RH.",
    ctaPadrao: "Falar com o gestor",
  },
  "restrito-sensivel": {
    emoji: "🔒",
    titulo: "Informação confidencial",
    texto:
      "Esse dado é protegido por política interna. Só pessoas com responsabilidade específica têm acesso.",
  },
  "restrito-c-level": {
    emoji: "🔐",
    titulo: "Dados de C-Level",
    texto:
      "Informações de diretoria e sócios são confidenciais pela nossa política. Apenas Super Admin tem acesso.",
  },
  "retencao-legal": {
    emoji: "📜",
    titulo: "Mantido por obrigação legal",
    texto:
      "Esse dado precisa ficar com a gente por um tempo determinado em lei (trabalhista, fiscal ou previdenciária). Quando o prazo vencer, será apagado automaticamente.",
  },
};

export function AcessoBloqueado({ tipo = "sem-permissao", motivo, sugestao, onVoltar, onCta }: Props) {
  const c = CONFIG[tipo];
  const ctaLabel = sugestao ?? c.ctaPadrao;

  return (
    <Card className="max-w-md mx-auto mt-12">
      <CardContent className="p-8 text-center space-y-4">
        <div className="text-5xl" aria-hidden>
          {c.emoji}
        </div>
        <h2 className="text-xl font-medium text-primary">{c.titulo}</h2>
        <p className="text-sm text-muted-foreground">{motivo ?? c.texto}</p>
        {(onVoltar || (ctaLabel && onCta)) && (
          <div className="flex gap-2 justify-center pt-2">
            {onVoltar && (
              <Button variant="outline" onClick={onVoltar}>
                Voltar
              </Button>
            )}
            {ctaLabel && onCta && (
              <Button onClick={onCta}>{ctaLabel}</Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
