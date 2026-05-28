import { NavLink } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import { SidebarMenuItem, SidebarMenuButton } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface FinancasSidebarItemProps {
  to: string;
  icon: LucideIcon;
  label: string;
  end?: boolean;
}

export function FinancasSidebarItem({ to, icon: Icon, label, end = false }: FinancasSidebarItemProps) {
  return (
    <SidebarMenuItem>
      <SidebarMenuButton asChild tooltip={label}>
        <NavLink
          to={to}
          end={end}
          className={({ isActive }) =>
            cn(
              "flex items-center gap-2 px-3 py-1.5 text-sm transition-colors border-l-2 border-transparent",
              isActive
                ? "border-gold bg-gold/10 text-foreground font-medium [&_svg]:text-gold"
                : "text-muted-foreground hover:text-foreground hover:bg-sidebar-accent/30"
            )
          }
        >
          <Icon className="h-4 w-4 flex-shrink-0" />
          <span className="truncate">{label}</span>
        </NavLink>
      </SidebarMenuButton>
    </SidebarMenuItem>
  );
}
