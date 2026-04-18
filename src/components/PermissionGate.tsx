import { usePermissions } from "@/hooks/usePermissions";
import { AcessoBloqueado } from "@/components/AcessoBloqueado";
import type { ReactNode } from "react";

type TipoBloqueio = "sem-permissao" | "restrito-sensivel" | "restrito-c-level" | "retencao-legal";

interface PermissionGateProps {
  module: string;
  /** Ação a verificar. Default: "view". Aceita também `permission` por retrocompatibilidade. */
  action?: string;
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
  tipoBloqueio?: TipoBloqueio;
}

export function PermissionGate({
  module,
  action,
  permission,
  children,
  fallback,
  tipoBloqueio = "sem-permissao",
}: PermissionGateProps) {
  const { canAccess, isSuperAdmin } = usePermissions();

  // Regra 1 na Pedra: Super Admin sempre passa
  if (isSuperAdmin) return <>{children}</>;

  const effectiveAction = action ?? permission ?? "view";
  if (!canAccess(module, effectiveAction)) {
    return <>{fallback ?? <AcessoBloqueado tipo={tipoBloqueio} />}</>;
  }

  return <>{children}</>;
}
