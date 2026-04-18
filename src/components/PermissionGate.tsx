import { usePermissions } from "@/hooks/usePermissions";
import type { ReactNode } from "react";

interface PermissionGateProps {
  module: string;
  /** Ação a verificar. Default: "view". Aceita também `permission` por retrocompatibilidade. */
  action?: string;
  permission?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export function PermissionGate({
  module,
  action,
  permission,
  children,
  fallback = null,
}: PermissionGateProps) {
  const { canAccess, isSuperAdmin } = usePermissions();

  // Regra 1 na Pedra: Super Admin sempre passa
  if (isSuperAdmin) return <>{children}</>;

  const effectiveAction = action ?? permission ?? "view";
  if (!canAccess(module, effectiveAction)) return <>{fallback}</>;

  return <>{children}</>;
}
