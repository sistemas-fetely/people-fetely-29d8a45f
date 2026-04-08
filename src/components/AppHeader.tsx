import { Bell, Search, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useLocation } from "react-router-dom";
import { useState } from "react";

const routeNames: Record<string, string> = {
  "/": "Dashboard",
  "/colaboradores": "Colaboradores",
  "/organograma": "Organograma",
  "/folha-pagamento": "Folha de Pagamento",
  "/ferias": "Férias",
  "/ponto": "Controle de Ponto",
  "/beneficios": "Benefícios",
  "/contratos-pj": "Contratos PJ",
  "/notas-fiscais": "Notas Fiscais",
  "/pagamentos-pj": "Pagamentos PJ",
  "/recrutamento": "Recrutamento",
  "/avaliacoes": "Avaliações",
  "/treinamentos": "Treinamentos",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/autoatendimento": "Autoatendimento",
};

export function AppHeader() {
  const location = useLocation();
  const pageName = routeNames[location.pathname] || "Página";
  const [darkMode, setDarkMode] = useState(false);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card px-4 card-shadow">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>RH System</span>
        <span>/</span>
        <span className="font-medium text-foreground">{pageName}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        <div className="relative hidden md:block">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar..."
            className="w-64 pl-8 h-9 bg-muted/50 border-0"
          />
        </div>
        <Button variant="ghost" size="icon" className="relative h-9 w-9" onClick={toggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button variant="ghost" size="icon" className="relative h-9 w-9">
          <Bell className="h-4 w-4" />
          <Badge className="absolute -right-0.5 -top-0.5 h-4 w-4 rounded-full p-0 text-[10px] flex items-center justify-center bg-destructive text-destructive-foreground border-0">
            3
          </Badge>
        </Button>
      </div>
    </header>
  );
}
