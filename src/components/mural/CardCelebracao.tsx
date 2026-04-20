import { Sparkles } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import type { Publicacao } from "@/hooks/useMural";

interface Props {
  publicacao: Publicacao;
}

interface Tema {
  bg: string;
  border: string;
  texto: string;
  destaque: string;
}

const temas: Record<string, Tema> = {
  rosa: {
    bg: "bg-pink-50 dark:bg-pink-950/40",
    border: "border-pink-200 dark:border-pink-900",
    texto: "text-rose-900 dark:text-rose-100",
    destaque: "text-rose-700 dark:text-rose-200",
  },
  verde: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-900",
    texto: "text-emerald-900 dark:text-emerald-100",
    destaque: "text-emerald-700 dark:text-emerald-200",
  },
  creme: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-200 dark:border-amber-900",
    texto: "text-amber-900 dark:text-amber-100",
    destaque: "text-amber-700 dark:text-amber-200",
  },
  sage: {
    bg: "bg-lime-50 dark:bg-lime-950/30",
    border: "border-lime-200 dark:border-lime-900",
    texto: "text-lime-900 dark:text-lime-100",
    destaque: "text-lime-700 dark:text-lime-200",
  },
  bordo: {
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-200 dark:border-red-900",
    texto: "text-red-900 dark:text-red-100",
    destaque: "text-red-700 dark:text-red-200",
  },
};

function initials(nome: string | null): string {
  if (!nome) return "F";
  return nome
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0])
    .join("")
    .toUpperCase();
}

export function CardCelebracao({ publicacao }: Props) {
  const tema = temas[publicacao.cor_tema] || temas.rosa;

  return (
    <div
      className={`relative rounded-2xl border ${tema.bg} ${tema.border} p-5 transition-all duration-500`}
    >
      <div className={`flex items-center gap-1.5 text-[11px] font-medium uppercase tracking-wider ${tema.destaque} mb-3`}>
        <Sparkles className="h-3 w-3" />
        Celebre o que importa
      </div>

      <div className="flex items-start gap-4">
        {publicacao.pessoa_alvo_nome && (
          <Avatar className="h-16 w-16 shrink-0 ring-2 ring-white dark:ring-white/10 shadow-sm">
            <AvatarImage src={publicacao.foto_url ?? undefined} alt={publicacao.pessoa_alvo_nome} />
            <AvatarFallback className="bg-white/80 text-base font-semibold">
              {initials(publicacao.pessoa_alvo_nome)}
            </AvatarFallback>
          </Avatar>
        )}

        <div className="flex-1 min-w-0">
          {publicacao.emoji && (
            <div className="text-2xl mb-1 leading-none">{publicacao.emoji}</div>
          )}
          <h3 className={`text-base font-semibold ${tema.texto} leading-tight`}>
            {publicacao.titulo}
          </h3>
          {publicacao.mensagem && (
            <p className={`mt-2 text-sm ${tema.texto} opacity-90 leading-relaxed`}>
              {publicacao.mensagem}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
