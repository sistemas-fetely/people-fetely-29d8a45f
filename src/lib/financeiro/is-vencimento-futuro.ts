/**
 * Sprint Melhorias CP (29/04/2026)
 *
 * Determina se uma data de vencimento cai no PRÓXIMO MÊS ou depois.
 * Uso: dar destaque visual (fundo azul) pra contas/movimentações
 * de meses futuros, distinguindo do mês corrente.
 *
 * Regra:
 *   - data >= 1º dia do próximo mês → true (futuro)
 *   - data < 1º dia do próximo mês → false (mês corrente, atrasado, ou pago)
 */
export function isVencimentoFuturo(dataVencimento: string | null | undefined): boolean {
  if (!dataVencimento) return false;

  // Suporta ISO date (YYYY-MM-DD) e timestamp (com hora)
  const venc = new Date(
    dataVencimento.length === 10 ? dataVencimento + "T00:00:00" : dataVencimento
  );
  if (isNaN(venc.getTime())) return false;
  venc.setHours(0, 0, 0, 0);

  const inicioProximoMes = new Date();
  inicioProximoMes.setDate(1);
  inicioProximoMes.setMonth(inicioProximoMes.getMonth() + 1);
  inicioProximoMes.setHours(0, 0, 0, 0);

  return venc.getTime() >= inicioProximoMes.getTime();
}

/**
 * Helper de conveniência pra usar diretamente no className de uma <TableRow>:
 *   <TableRow className={cn(rowClass, classFundoFuturo(c.data_vencimento))}>
 *
 * Mantém intensidade baixa pra não competir com texto e respeita dark mode.
 */
export function classFundoFuturo(dataVencimento: string | null | undefined): string {
  return isVencimentoFuturo(dataVencimento)
    ? "bg-sky-50/60 dark:bg-sky-950/20 hover:bg-sky-100/60 dark:hover:bg-sky-900/30"
    : "";
}
