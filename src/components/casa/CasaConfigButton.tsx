import { Settings, Users, Shield, SlidersHorizontal, Briefcase, FileBarChart, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const items = [
  { label: "Parâmetros", path: "/admin/parametros", icon: SlidersHorizontal },
  { label: "Configurações", path: "/admin/configuracoes", icon: Settings },
  { label: "Usuários", path: "/admin/usuarios", icon: Users },
  { label: "Perfis de acesso", path: "/admin/usuarios/perfis", icon: Shield },
  { label: "Cargos", path: "/admin/cargos", icon: Briefcase },
  { label: "Reportes do sistema", path: "/admin/reportes", icon: FileBarChart },
  { label: "Importações PDF", path: "/admin/importacoes-pdf", icon: FileText },
];

export function CasaConfigButton() {
  const navigate = useNavigate();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-gold hover:text-gold-light hover:bg-gold/10"
          aria-label="Configurações"
        >
          <Settings className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Configurações do sistema</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map(({ label, path, icon: Icon }) => (
          <DropdownMenuItem key={path} onClick={() => navigate(path)}>
            <Icon className="mr-2 h-4 w-4" />
            <span>{label}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
