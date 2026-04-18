/**
 * Regra 15 — Proteção de dados C-Level.
 *
 * C-Level: diretores e cargos executivos. Apenas super_admin pode ver
 * dados sensíveis (remuneração, avaliações, observações internas).
 */
export interface CLevelCheck {
  nivel?: string | null;
  cargo?: string | null;
}

const CLEVEL_REGEX =
  /\b(director|diretor|ceo|cfo|coo|cto|cmo|cio|chro|presidente|vice[-\s]?presidente|vp)\b/i;

export function ehCLevel(user: CLevelCheck): boolean {
  if (!user) return false;
  if (user.nivel === "diretor" || user.nivel === "c_level") return true;
  if (user.cargo && CLEVEL_REGEX.test(user.cargo)) return true;
  return false;
}
