import { Eye } from "lucide-react";
import { useSalarioVisivel } from "@/hooks/useSalarioVisivel";

interface Props {
  valor: number | null | undefined;
  /** user_id do colaborador alvo (não o do visualizador) */
  userId: string | null | undefined;
  /** contexto da consulta — vai pro audit log */
  contexto: string;
  className?: string;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

/**
 * Regra 7 — Salário sempre mascarado por default.
 * Clique do usuário autorizado registra log de acesso e revela na sessão.
 */
export function SalarioMasked({ valor, userId, contexto, className }: Props) {
  const { podeVer, revelar, estaRevelado } = useSalarioVisivel();

  const valorNumerico = typeof valor === "number" ? valor : 0;

  if (!podeVer(userId)) {
    return (
      <span className={`text-muted-foreground font-mono ${className ?? ""}`} aria-label="Salário restrito">
        R$ •••••
      </span>
    );
  }

  if (estaRevelado(userId)) {
    return (
      <span className={`font-mono ${className ?? ""}`}>
        {formatBRL(valorNumerico)}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        void revelar(userId, contexto);
      }}
      className={`text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline ${className ?? ""}`}
      aria-label="Mostrar salário (será registrado um log de acesso)"
    >
      <Eye className="h-3 w-3" /> Mostrar salário
    </button>
  );
}
