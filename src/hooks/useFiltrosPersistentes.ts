import { useState, useEffect, type Dispatch, type SetStateAction } from "react";

/**
 * Hook genérico que persiste o valor de um filtro em sessionStorage.
 * O valor sobrevive a navegações dentro da sessão mas é descartado ao fechar
 * o navegador.
 *
 *   const [busca, setBusca] = useFiltrosPersistentes("cp_busca", "");
 */
export function useFiltrosPersistentes<T>(
  chave: string,
  valorInicial: T
): [T, Dispatch<SetStateAction<T>>] {
  const [valor, setValor] = useState<T>(() => {
    try {
      const saved = sessionStorage.getItem("filtro_" + chave);
      return saved !== null ? (JSON.parse(saved) as T) : valorInicial;
    } catch {
      return valorInicial;
    }
  });

  useEffect(() => {
    try {
      sessionStorage.setItem("filtro_" + chave, JSON.stringify(valor));
    } catch {
      /* quota / disabled — silencioso */
    }
  }, [chave, valor]);

  return [valor, setValor];
}
