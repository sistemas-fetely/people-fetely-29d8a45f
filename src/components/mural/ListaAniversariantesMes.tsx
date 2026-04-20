import { useState } from "react";
import { Cake, Sparkles, Crown } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { useAniversariantesDoMes, type EventoDoMes } from "@/hooks/useAniversariantesDoMes";
import { DrawerUsuario } from "@/components/DrawerUsuario";

function initials(nome: string): string {
  return nome.split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
}

const MESES_PT = [
  "janeiro", "fevereiro", "março", "abril", "maio", "junho",
  "julho", "agosto", "setembro", "outubro", "novembro", "dezembro",
];

// ═══ Item de hoje — destaque dourado grande ═══
function ItemDestaqueHoje({ evento, onClick }: { evento: EventoDoMes; onClick: () => void }) {
  const Icon = evento.tipo_evento === "aniversario" ? Cake : Sparkles;
  return (
    <button
      onClick={onClick}
      className="relative w-full rounded-xl border-2 border-amber-400 bg-gradient-to-br from-amber-50 to-amber-100/50 dark:from-amber-950/30 dark:to-amber-900/20 p-3 text-left hover:shadow-md transition-all"
    >
      <div className="absolute -top-2 -right-2 text-2xl drop-shadow-sm" aria-hidden>
        👑
      </div>
      <div className="flex items-center gap-3">
        <Avatar className="h-14 w-14 ring-2 ring-amber-400 ring-offset-2 ring-offset-background flex-shrink-0">
          <AvatarImage src={evento.foto_url ?? undefined} alt={evento.nome} />
          <AvatarFallback className="bg-amber-200 text-amber-900 font-semibold">
            {initials(evento.nome)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate text-foreground">{evento.nome}</p>
          <p className="text-xs flex items-center gap-1 text-amber-700 dark:text-amber-400 font-medium mt-0.5">
            <Icon className="h-3.5 w-3.5" />
            {evento.label_destaque}
          </p>
          {evento.tipo_evento === "tempo_casa" && (
            <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{evento.subtitulo}</p>
          )}
        </div>
      </div>
    </button>
  );
}

// ═══ Item compacto regular (linha) ═══
function ItemCompacto({ evento, onClick }: { evento: EventoDoMes; onClick: () => void }) {
  const Icon = evento.tipo_evento === "aniversario" ? Cake : Sparkles;
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-muted/60 transition-colors text-left"
    >
      <Avatar className="h-9 w-9 flex-shrink-0">
        <AvatarImage src={evento.foto_url ?? undefined} alt={evento.nome} />
        <AvatarFallback className="text-xs bg-muted">{initials(evento.nome)}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate text-foreground">{evento.nome}</p>
        <p className="text-xs text-muted-foreground flex items-center gap-1 truncate">
          <Icon className="h-3 w-3 flex-shrink-0" />
          <span className="truncate">
            dia {evento.dia} · {evento.tipo_evento === "aniversario" ? "aniversário" : evento.subtitulo}
          </span>
        </p>
      </div>
    </button>
  );
}

export function ListaAniversariantesMes() {
  const { data: eventos, isLoading } = useAniversariantesDoMes();
  const [drawerUserId, setDrawerUserId] = useState<string | null>(null);

  const mesAtual = MESES_PT[new Date().getMonth()];

  if (isLoading) {
    return (
      <div className="rounded-xl border bg-card p-4 space-y-3 h-full">
        <Skeleton className="h-5 w-40" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!eventos || eventos.length === 0) {
    return (
      <div className="rounded-xl border bg-card p-4 h-full flex flex-col items-center justify-center text-center gap-2 min-h-[200px]">
        <Cake className="h-8 w-8 text-muted-foreground/40" />
        <p className="text-sm text-muted-foreground">
          Sem aniversariantes em {mesAtual} — mas sempre tem algo pra comemorar.
        </p>
      </div>
    );
  }

  const deHoje = eventos.filter((e) => e.eh_hoje);
  const demais = eventos.filter((e) => !e.eh_hoje);

  return (
    <>
      <div className="rounded-xl border bg-card p-4 h-full flex flex-col gap-3 overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-2 flex-shrink-0">
          <Cake className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold">Aniversariantes de {mesAtual}</h3>
        </div>

        {/* Destaque hoje */}
        {deHoje.length > 0 && (
          <div className="space-y-2 flex-shrink-0">
            {deHoje.map((ev) => (
              <ItemDestaqueHoje
                key={ev.key}
                evento={ev}
                onClick={() => ev.user_id && setDrawerUserId(ev.user_id)}
              />
            ))}
          </div>
        )}

        {/* Separador sutil se tiver ambos */}
        {deHoje.length > 0 && demais.length > 0 && (
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="h-px bg-border flex-1" />
            <span className="text-[10px] uppercase tracking-wide text-muted-foreground">outros do mês</span>
            <div className="h-px bg-border flex-1" />
          </div>
        )}

        {/* Lista vertical com scroll interno */}
        {demais.length > 0 && (
          <div className="flex-1 overflow-y-auto space-y-0.5 -mx-2 px-1">
            {demais.map((ev) => (
              <ItemCompacto
                key={ev.key}
                evento={ev}
                onClick={() => ev.user_id && setDrawerUserId(ev.user_id)}
              />
            ))}
          </div>
        )}
      </div>

      <DrawerUsuario
        userId={drawerUserId}
        open={!!drawerUserId}
        onOpenChange={(open) => !open && setDrawerUserId(null)}
      />
    </>
  );
}
