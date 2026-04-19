import { Eye, Lock } from "lucide-react";
import { useEffect, useState } from "react";
import { useSalarioVisivel, type ContextoSalario } from "@/hooks/useSalarioVisivel";

interface Props {
  valor: number | null | undefined;
  /** user_id do colaborador alvo (não o do visualizador) */
  userId: string | null | undefined;
  /** contexto da consulta — vai pro audit log e pra resolução de política */
  contexto: ContextoSalario;
  className?: string;
  /** Mostrar tooltip "Visível apenas para..." quando oculto. */
  mostrarRestricao?: boolean;
}

function formatBRL(v: number) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(v);
}

/**
 * Regra 7 — Salário com política universal de visibilidade.
 * Consulta `decisao_salario` no banco e exibe conforme o modo: direto, clique+log, ou oculto.
 */
export function SalarioMasked({
  valor,
  userId,
  contexto,
  className,
  mostrarRestricao = true,
}: Props) {
  const { consultarModo, estaRevelado, revelar } = useSalarioVisivel(contexto);
  const [modo, setModo] = useState<"direto" | "revelar_com_log" | "oculto" | "carregando">(
    "carregando",
  );

  useEffect(() => {
    let cancelado = false;
    consultarModo(userId || null).then((m) => {
      if (!cancelado) setModo(m);
    });
    return () => {
      cancelado = true;
    };
  }, [userId, consultarModo]);

  const valorNum = typeof valor === "number" ? valor : 0;

  if (modo === "carregando") {
    return (
      <span className={`text-muted-foreground font-mono ${className ?? ""}`} aria-label="Carregando">
        …
      </span>
    );
  }

  if (modo === "oculto") {
    return (
      <span
        className={`text-muted-foreground font-mono inline-flex items-center gap-1 ${className ?? ""}`}
        title={mostrarRestricao ? "Visível apenas para perfis autorizados" : undefined}
        aria-label="Salário restrito"
      >
        <Lock className="h-3 w-3" />
        •••••
      </span>
    );
  }

  if (modo === "direto" || estaRevelado(userId || null)) {
    return <span className={`font-mono ${className ?? ""}`}>{formatBRL(valorNum)}</span>;
  }

  // revelar_com_log e ainda não revelado
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        if (userId) void revelar(userId);
      }}
      className={`text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs underline-offset-4 hover:underline ${className ?? ""}`}
      aria-label="Mostrar salário (será registrado um log de acesso)"
    >
      <Eye className="h-3 w-3" /> Mostrar salário
    </button>
  );
}
