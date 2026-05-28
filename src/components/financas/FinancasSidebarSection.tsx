import { ReactNode, useState } from "react";
import { ChevronRight } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { SidebarMenu } from "@/components/ui/sidebar";
import { cn } from "@/lib/utils";

interface FinancasSidebarSectionProps {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}

export function FinancasSidebarSection({
  title,
  children,
  defaultOpen = true,
}: FinancasSidebarSectionProps) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="group/section">
      <CollapsibleTrigger
        className={cn(
          "flex w-full items-center justify-between px-3 py-1.5 text-xs font-medium text-foreground rounded-md transition-colors",
          "hover:bg-sidebar-accent"
        )}
      >
        <span>{title}</span>
        <ChevronRight
          className={cn(
            "h-3.5 w-3.5 transition-transform duration-200",
            open && "rotate-90"
          )}
        />
      </CollapsibleTrigger>
      <CollapsibleContent className="overflow-hidden data-[state=closed]:animate-collapsible-up data-[state=open]:animate-collapsible-down">
        <SidebarMenu className="mt-1">{children}</SidebarMenu>
      </CollapsibleContent>
    </Collapsible>
  );
}
