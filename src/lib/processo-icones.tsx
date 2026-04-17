import {
  Workflow, Rocket, LogOut, ArrowLeftRight, ShoppingCart, DollarSign,
  FileText, Users, Briefcase, ClipboardList, Settings, Zap,
  type LucideIcon,
} from "lucide-react";

export const ICONE_MAP: Record<string, LucideIcon> = {
  workflow: Workflow,
  rocket: Rocket,
  "log-out": LogOut,
  "arrow-left-right": ArrowLeftRight,
  "shopping-cart": ShoppingCart,
  "dollar-sign": DollarSign,
  "file-text": FileText,
  users: Users,
  briefcase: Briefcase,
  "clipboard-list": ClipboardList,
  settings: Settings,
  zap: Zap,
};

export function getProcessoIcon(name: string | null | undefined): LucideIcon {
  if (!name) return Workflow;
  return ICONE_MAP[name] ?? Workflow;
}

export function naturezaLabel(n: string | null | undefined): string {
  switch (n) {
    case "lista_tarefas": return "Lista de Tarefas";
    case "workflow": return "Workflow";
    case "guia": return "Guia";
    default: return n ?? "—";
  }
}
