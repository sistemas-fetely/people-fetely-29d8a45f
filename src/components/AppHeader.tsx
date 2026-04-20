import { Bell, Moon, Sun } from "lucide-react";
import { SidebarTrigger } from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { ScrollArea } from "@/components/ui/scroll-area";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useTrackPageVisit } from "@/hooks/useTrackPageVisit";
import { RecentesEFavoritos } from "@/components/navegacao/RecentesEFavoritos";

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
  "/recrutamento": "Recrutamento",
  "/avaliacoes": "Avaliações",
  "/treinamentos": "Treinamentos",
  "/relatorios": "Relatórios",
  "/configuracoes": "Configurações",
  "/autoatendimento": "Autoatendimento",
};

interface Notificacao {
  id: string;
  tipo: string;
  titulo: string;
  mensagem: string | null;
  link: string | null;
  lida: boolean;
  created_at: string;
}

export function AppHeader() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const pageName = routeNames[location.pathname] || "Página";
  const [darkMode, setDarkMode] = useState(false);
  useTrackPageVisit();
  const [notificacoes, setNotificacoes] = useState<Notificacao[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const toggleDark = () => {
    setDarkMode(!darkMode);
    document.documentElement.classList.toggle("dark");
  };

  useEffect(() => {
    if (!user?.id) return;

    const fetchNotifications = async () => {
      const { data } = await supabase
        .from("notificacoes_rh")
        .select("*")
        .or(`user_id.eq.${user.id},user_id.is.null`)
        .order("created_at", { ascending: false })
        .limit(20);

      if (data) {
        setNotificacoes(data as Notificacao[]);
        setUnreadCount(data.filter((n: any) => !n.lida).length);
      }
    };

    fetchNotifications();

    // Subscribe to realtime changes
    const channel = supabase
      .channel("notificacoes_rh_header")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notificacoes_rh" },
        () => fetchNotifications()
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [user?.id]);

  const markAsRead = async (notif: Notificacao) => {
    if (!notif.lida) {
      await supabase.from("notificacoes_rh").update({ lida: true }).eq("id", notif.id);
      setNotificacoes(prev => prev.map(n => n.id === notif.id ? { ...n, lida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }
    if (notif.link) navigate(notif.link);
  };

  const markAllRead = async () => {
    const unreadIds = notificacoes.filter(n => !n.lida).map(n => n.id);
    if (unreadIds.length === 0) return;
    await supabase.from("notificacoes_rh").update({ lida: true }).in("id", unreadIds);
    setNotificacoes(prev => prev.map(n => ({ ...n, lida: true })));
    setUnreadCount(0);
  };

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-card/80 backdrop-blur-sm px-4 card-shadow">
      <SidebarTrigger className="-ml-1" />
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <span>People Fetély</span>
        <span className="text-border">/</span>
        <span className="font-medium text-primary">{pageName}</span>
      </div>
      <div className="ml-auto flex items-center gap-2">
        {/* Busca global desativada — Fetely usa Fala Fetely como interface principal de descoberta.
            Quando reativarmos, virá como ⌘K integrado a Recentes + Favoritos no Projeto Navegação Transversal. */}
        <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-accent" onClick={toggleDark}>
          {darkMode ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>

        <RecentesEFavoritos />

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="icon" className="relative h-9 w-9 rounded-xl hover:bg-accent">
              <Bell className="h-4 w-4" />
              {unreadCount > 0 && (
                <Badge className="absolute -right-0.5 -top-0.5 h-4 min-w-4 rounded-full p-0 text-[10px] flex items-center justify-center bg-primary text-primary-foreground border-0">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </Badge>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 p-0" align="end">
            <div className="flex items-center justify-between px-4 py-3 border-b">
              <h4 className="text-sm font-semibold">Notificações</h4>
              {unreadCount > 0 && (
                <Button variant="ghost" size="sm" className="text-xs h-7" onClick={markAllRead}>
                  Marcar todas como lidas
                </Button>
              )}
            </div>
            <ScrollArea className="max-h-[360px]">
              {notificacoes.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Nenhuma notificação</p>
              ) : (
                notificacoes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => markAsRead(n)}
                    className={`w-full text-left px-4 py-3 border-b last:border-0 hover:bg-muted/50 transition-colors ${!n.lida ? "bg-primary/5" : ""}`}
                  >
                    <p className={`text-sm ${!n.lida ? "font-semibold" : ""}`}>{n.titulo}</p>
                    {n.mensagem && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.mensagem}</p>}
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(n.created_at), { locale: ptBR, addSuffix: true })}
                    </p>
                  </button>
                ))
              )}
            </ScrollArea>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
