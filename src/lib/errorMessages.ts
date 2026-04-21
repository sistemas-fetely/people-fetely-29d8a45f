/**
 * Converte mensagens de erro técnicas em mensagens amigáveis para o usuário.
 * Use sempre que for exibir error.message diretamente em toast/UI.
 */
export function humanizeError(raw: string | null | undefined): string {
  if (!raw) return "Algo deu errado. Tente novamente ou reporte o problema.";
  if (raw.includes("non-2xx"))
    return "O servidor encontrou um problema ao processar sua solicitação. Se o erro persistir, use o botão de report.";
  if (raw.includes("email") && raw.includes("not found"))
    return "E-mail não encontrado. Verifique se o e-mail corporativo foi cadastrado.";
  if (raw.includes("already registered") || raw.includes("already been registered"))
    return "Este e-mail já possui um usuário cadastrado.";
  if (raw.includes("JWT") || raw.includes("expired"))
    return "Sua sessão expirou. Faça login novamente.";
  if (raw.toLowerCase().includes("invalid login credentials"))
    return "E-mail ou senha incorretos.";
  if (raw.toLowerCase().includes("password") && raw.toLowerCase().includes("weak"))
    return "Senha fraca. Use no mínimo 10 caracteres com maiúscula, número e caractere especial.";
  return raw;
}
