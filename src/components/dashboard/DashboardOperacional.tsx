import { useEffect, useState, useMemo, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  CheckCircle2, AlertCircle, AlertTriangle, Clock, Users, FileText,
  Briefcase, UserPlus, ClipboardCheck, Mail, FileSignature, Receipt,
  TrendingUp, Calendar, Gauge, ClipboardList, Plus, Pin, MoreVertical,
  Check, X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useDashboardData } from "@/hooks/useDashboardData";
import { NovaTarefaDialog } from "./NovaTarefaDialog";
import { toast } from "sonner";

type AlertaPrioridade = "alta" | "media" | "baixa";
interface AlertaItem {
  id: string;
  titulo: string;
  detalhe: string;
  prioridade: AlertaPrioridade;
  rota?: string;
}

type Prioridade = "urgente" | "atencao" | "normal";

interface TarefaItem {
  id: string;
  prioridade: Prioridade;
  icone: React.ElementType;
  titulo: string;
  detalhe: string;
  acao: string;
  rota: string;
  ordem: number; // antiguidade em dias (maior = mais antigo)
  manual?: boolean; // se true, vem de sncf_tarefas (tarefa criada manualmente)
  sncfId?: string; // id em sncf_tarefas, quando manual
}

interface KpiItem {
  label: string;
  valor: number;
  icone: React.ElementType;
  cor: string;
  rota?: string;
}

interface VelocidadeItem {
  label: string;
  valor: string;
  icone: React.ElementType;
  detalhe?: string;
}

const FETELY_GREEN = "#1A4A3A";

const prioridadeColor: Record<Prioridade, string> = {
  urgente: "bg-destructive/10 text-destructive",
  atencao: "bg-warning/10 text-warning",
  normal: "bg-success/10 text-success",
};

const prioridadeIcon: Record<Prioridade, React.ElementType> = {
  urgente: AlertCircle,
  atencao: AlertTriangle,
  normal: Clock,
};

function diasDesde(dateStr: string): number {
  const d = new Date(dateStr);
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

export function DashboardOperacional() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [tarefas, setTarefas] = useState<TarefaItem[]>([]);
  const [kpis, setKpis] = useState<KpiItem[]>([]);
  const [velocidade, setVelocidade] = useState<VelocidadeItem[]>([]);
  const [novaOpen, setNovaOpen] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const dashData = useDashboardData();

  const alertas = useMemo<AlertaItem[]>(() => {
    const list: AlertaItem[] = [];
    const { pj, ferias, nfPendentes, pagPjPendentes, folha, experienciaVencendo, docsVencendo, aniversariosEmpresa, semBeneficio, contratosPendentes } = dashData;

    if (ferias?.periodoVencido > 0) {
      list.push({ id: "ferias-venc", titulo: `${ferias.periodoVencido} período(s) de férias vencido(s)`, detalhe: "Saldo pendente", prioridade: "alta", rota: "/ferias" });
    }
    if (pj?.vencendo > 0) {
      list.push({ id: "pj-venc", titulo: `${pj.vencendo} contrato(s) PJ vencendo`, detalhe: "Próximos 30 dias", prioridade: "alta", rota: "/contratos-pj" });
    }
    (experienciaVencendo || []).forEach((e: any, i: number) => {
      list.push({
        id: `exp-${i}`,
        titulo: `${e.nome} — experiência ${e.marco} dias`,
        detalhe: e.diasRestantes > 0 ? `${e.diasRestantes} dia(s) restante(s) · ${e.depto}` : `Vence hoje · ${e.depto}`,
        prioridade: "alta",
        rota: "/colaboradores",
      });
    });
    (docsVencendo || []).forEach((d: any, i: number) => {
      list.push({
        id: `doc-${i}`,
        titulo: `${d.documento} de ${d.nome} ${d.vencido ? "vencida" : "vencendo"}`,
        detalhe: `Validade: ${new Date(d.validade + "T00:00:00").toLocaleDateString("pt-BR")} · ${d.depto}`,
        prioridade: d.vencido ? "alta" : "media",
        rota: "/colaboradores",
      });
    });
    if (contratosPendentes && contratosPendentes.length > 0) {
      list.push({
        id: "contratos-pend",
        titulo: `${contratosPendentes.length} contrato(s) PJ pendente(s) de assinatura`,
        detalhe: contratosPendentes.slice(0, 3).map((c: any) => c.nome).join(", ") + (contratosPendentes.length > 3 ? "..." : ""),
        prioridade: "alta",
        rota: "/contratos-pj",
      });
    }
    if (semBeneficio && semBeneficio.length > 0) {
      list.push({
        id: "sem-benef",
        titulo: `${semBeneficio.length} colaborador(es) sem benefícios`,
        detalhe: semBeneficio.slice(0, 3).map((s: any) => s.nome).join(", ") + (semBeneficio.length > 3 ? "..." : ""),
        prioridade: "media",
        rota: "/beneficios",
      });
    }
    if (folha?.atual && folha.atual.status === "aberta") {
      list.push({ id: "folha", titulo: `Folha ${folha.atual.competencia} em aberto`, detalhe: "Fechar folha", prioridade: "media", rota: "/folha-pagamento" });
    }
    if (nfPendentes > 0) {
      list.push({ id: "nf", titulo: `${nfPendentes} nota(s) fiscal(is) pendente(s)`, detalhe: "Aguardando processamento", prioridade: "media", rota: "/notas-fiscais" });
    }
    if (pagPjPendentes > 0) {
      list.push({ id: "pag-pj", titulo: `${pagPjPendentes} pagamento(s) PJ pendente(s)`, detalhe: "Aguardando pagamento", prioridade: "media", rota: "/pagamentos-pj" });
    }
    (aniversariosEmpresa || []).forEach((a: any, i: number) => {
      list.push({ id: `aniv-${i}`, titulo: `${a.nome} completa ${a.anos} ano(s) de empresa`, detalhe: `${a.data} · ${a.depto}`, prioridade: "baixa" });
    });

    const order = { alta: 0, media: 1, baixa: 2 };
    list.sort((a, b) => order[a.prioridade] - order[b.prioridade]);
    return list;
  }, [dashData]);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      try {
        const hoje = new Date();
        const em30d = new Date();
        em30d.setDate(em30d.getDate() + 30);
        const hojeStr = hoje.toISOString().slice(0, 10);
        const em30dStr = em30d.toISOString().slice(0, 10);

        const [
          convitesRes,
          tarefasRes,
          tarefasManuaisRes,
          vagasRes,
          candidatosRes,
          contratosVencRes,
          colabExpRes,
          folhaRes,
          nfRes,
        ] = await Promise.all([
          supabase
            .from("convites_cadastro")
            .select("id, nome, status, tipo, created_at, preenchido_em, updated_at"),
          supabase
            .from("sncf_tarefas")
            .select("id, titulo, status, prazo_data, processo_id, bloqueante")
            .eq("tipo_processo", "onboarding")
            .in("status", ["pendente", "atrasada"]),
          supabase
            .from("sncf_tarefas")
            .select("id, titulo, descricao, status, prazo_data, prioridade, area_destino, link_acao, colaborador_id, colaborador_tipo, colaborador_nome, created_at")
            .eq("tipo_processo", "manual")
            .in("status", ["pendente", "em_andamento", "atrasada"]),
          supabase
            .from("vagas" as any)
            .select("id, titulo, status, created_at")
            .eq("status", "aberta"),
          supabase
            .from("candidatos")
            .select("id, nome, status, created_at")
            .in("status", ["recebido", "triagem", "entrevista"]),
          supabase
            .from("contratos_pj")
            .select("id, contato_nome, razao_social, data_fim, status")
            .eq("status", "ativo")
            .not("data_fim", "is", null)
            .gte("data_fim", hojeStr)
            .lte("data_fim", em30dStr),
          supabase
            .from("colaboradores_clt")
            .select("id, nome_completo, data_admissao, fim_periodo_experiencia_1, fim_periodo_experiencia_2, status")
            .eq("status", "ativo"),
          supabase
            .from("folha_competencias")
            .select("id, competencia, status")
            .eq("status", "aberta"),
          supabase
            .from("notas_fiscais_pj")
            .select("id, status, contrato_id")
            .eq("status", "pendente"),
        ]);

        if (cancelled) return;

        const convites = convitesRes.data || [];
        const tarefasOnb = tarefasRes.data || [];
        const tarefasManuais = (tarefasManuaisRes.data || []) as any[];
        const vagas = (vagasRes.data || []) as any[];
        const candidatos = candidatosRes.data || [];
        const contratosVenc = contratosVencRes.data || [];
        const colabExp = colabExpRes.data || [];
        const folhasAbertas = folhaRes.data || [];
        const nfs = nfRes.data || [];

        // ─── Construir tarefas priorizadas ───
        const novasTarefas: TarefaItem[] = [];

        // Tarefas manuais
        const prioMap: Record<string, Prioridade> = { urgente: "urgente", normal: "normal", baixa: "normal" };
        tarefasManuais.forEach((t) => {
          const prio = prioMap[t.prioridade as string] || "normal";
          const atrasada = t.prazo_data && t.prazo_data < hojeStr;
          const ordem = t.prazo_data
            ? Math.floor((Date.now() - new Date(t.prazo_data).getTime()) / 86400000)
            : diasDesde(t.created_at);
          // Rota: prioriza colaborador, fallback link_acao
          let rotaManual = "";
          if (t.colaborador_id && t.colaborador_tipo === "clt") {
            rotaManual = `/colaboradores/${t.colaborador_id}`;
          } else if (t.colaborador_id && t.colaborador_tipo === "pj") {
            rotaManual = `/contratos-pj/${t.colaborador_id}`;
          } else if (t.link_acao) {
            rotaManual = t.link_acao;
          }
          novasTarefas.push({
            id: `manual-${t.id}`,
            sncfId: t.id,
            manual: true,
            prioridade: atrasada ? "urgente" : prio,
            icone: Pin,
            titulo: t.titulo,
            detalhe: [t.area_destino, t.colaborador_nome, t.descricao].filter(Boolean).join(" · ") || "Tarefa manual",
            acao: rotaManual ? "Abrir" : "Concluir",
            rota: rotaManual,
            ordem,
          });
        });

        // Convites preenchidos aguardando aprovação
        const aguardandoAprov = convites.filter((c) => c.status === "preenchido");
        if (aguardandoAprov.length > 0) {
          const maisAntigo = Math.max(
            ...aguardandoAprov.map((c) => diasDesde(c.preenchido_em || c.updated_at))
          );
          novasTarefas.push({
            id: "aprov",
            prioridade: maisAntigo > 3 ? "urgente" : "atencao",
            icone: ClipboardCheck,
            titulo: `${aguardandoAprov.length} cadastro${aguardandoAprov.length > 1 ? "s" : ""} aguardando aprovação`,
            detalhe: aguardandoAprov.slice(0, 3).map((c) => c.nome).join(", ") +
              (aguardandoAprov.length > 3 ? "..." : ""),
            acao: "Aprovar",
            rota: "/convites-cadastro?filter=preenchido",
            ordem: maisAntigo,
          });
        }

        // Convites aprovados aguardando criação
        const aprovados = convites.filter((c) => c.status === "aprovado");
        if (aprovados.length > 0) {
          const maisAntigo = Math.max(
            ...aprovados.map((c) => diasDesde(c.updated_at))
          );
          novasTarefas.push({
            id: "criar",
            prioridade: "urgente",
            icone: UserPlus,
            titulo: `${aprovados.length} colaborador${aprovados.length > 1 ? "es" : ""} aprovado${aprovados.length > 1 ? "s" : ""} aguardando criação`,
            detalhe: aprovados.slice(0, 3).map((c) => c.nome).join(", ") +
              (aprovados.length > 3 ? "..." : ""),
            acao: "Criar",
            rota: "/convites-cadastro?filter=aprovado",
            ordem: maisAntigo,
          });
        }

        // Convites devolvidos
        const devolvidos = convites.filter((c) => c.status === "devolvido");
        if (devolvidos.length > 0) {
          novasTarefas.push({
            id: "devolvidos",
            prioridade: "atencao",
            icone: AlertTriangle,
            titulo: `${devolvidos.length} convite${devolvidos.length > 1 ? "s" : ""} devolvido${devolvidos.length > 1 ? "s" : ""}`,
            detalhe: devolvidos.slice(0, 3).map((c) => c.nome).join(", ") +
              (devolvidos.length > 3 ? "..." : ""),
            acao: "Revisar",
            rota: "/convites-cadastro?filter=devolvido",
            ordem: Math.max(...devolvidos.map((c) => diasDesde(c.updated_at))),
          });
        }

        // Convites enviados aguardando preenchimento (lembrete se > 5 dias)
        const enviadosVelhos = convites.filter(
          (c) => c.status === "email_enviado" && diasDesde(c.created_at) > 5
        );
        if (enviadosVelhos.length > 0) {
          novasTarefas.push({
            id: "lembrar",
            prioridade: "normal",
            icone: Mail,
            titulo: `${enviadosVelhos.length} convite${enviadosVelhos.length > 1 ? "s" : ""} sem preenchimento há +5 dias`,
            detalhe: enviadosVelhos.slice(0, 3).map((c) => c.nome).join(", ") +
              (enviadosVelhos.length > 3 ? "..." : ""),
            acao: "Ver",
            rota: "/convites-cadastro?filter=email_enviado",
            ordem: Math.max(...enviadosVelhos.map((c) => diasDesde(c.created_at))),
          });
        }

        // Onboarding tarefas atrasadas — separar bloqueantes (legais) das normais
        const tarefasAtrasadas = tarefasOnb.filter((t: any) => {
          if (t.status === "atrasada") return true;
          if (t.prazo_data && t.prazo_data < hojeStr) return true;
          return false;
        });
        const atrasadasBloqueantes = tarefasAtrasadas.filter((t: any) => t.bloqueante);
        const atrasadasNormais = tarefasAtrasadas.filter((t: any) => !t.bloqueante);
        if (atrasadasBloqueantes.length > 0) {
          novasTarefas.push({
            id: "onb-legal-atraso",
            prioridade: "urgente",
            icone: AlertCircle,
            titulo: `${atrasadasBloqueantes.length} tarefa${atrasadasBloqueantes.length > 1 ? "s" : ""} LEGAIS de onboarding atrasada${atrasadasBloqueantes.length > 1 ? "s" : ""} — risco de multa`,
            detalhe: "Prazo legal ultrapassado — resolver imediatamente",
            acao: "Resolver",
            rota: "/onboarding",
            ordem: 9999,
          });
        }
        if (atrasadasNormais.length > 0) {
          novasTarefas.push({
            id: "onb-atraso",
            prioridade: "urgente",
            icone: ClipboardCheck,
            titulo: `${atrasadasNormais.length} tarefa${atrasadasNormais.length > 1 ? "s" : ""} de onboarding atrasada${atrasadasNormais.length > 1 ? "s" : ""}`,
            detalhe: "Resolva antes que afete a integração",
            acao: "Resolver",
            rota: "/onboarding",
            ordem: 999,
          });
        }

        // Contratos PJ vencendo em 30 dias
        if (contratosVenc.length > 0) {
          novasTarefas.push({
            id: "contratos-venc",
            prioridade: "atencao",
            icone: FileSignature,
            titulo: `${contratosVenc.length} contrato${contratosVenc.length > 1 ? "s" : ""} PJ vencendo em 30 dias`,
            detalhe: contratosVenc.slice(0, 3).map((c) => c.contato_nome || c.razao_social).join(", ") +
              (contratosVenc.length > 3 ? "..." : ""),
            acao: "Renovar",
            rota: "/contratos-pj",
            ordem: 30,
          });
        }

        // Períodos de experiência vencendo (45 e 90 dias)
        const expVencendo: any[] = [];
        colabExp.forEach((c: any) => {
          if (c.fim_periodo_experiencia_1) {
            const dias = Math.floor(
              (new Date(c.fim_periodo_experiencia_1).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (dias >= 0 && dias <= 7) expVencendo.push({ nome: c.nome_completo, dias, marco: 45 });
          }
          if (c.fim_periodo_experiencia_2) {
            const dias = Math.floor(
              (new Date(c.fim_periodo_experiencia_2).getTime() - Date.now()) / (1000 * 60 * 60 * 24)
            );
            if (dias >= 0 && dias <= 7) expVencendo.push({ nome: c.nome_completo, dias, marco: 90 });
          }
        });
        if (expVencendo.length > 0) {
          novasTarefas.push({
            id: "exp",
            prioridade: "urgente",
            icone: Calendar,
            titulo: `${expVencendo.length} período${expVencendo.length > 1 ? "s" : ""} de experiência vencendo`,
            detalhe: expVencendo.slice(0, 3).map((e) => `${e.nome} (${e.marco}d)`).join(", "),
            acao: "Avaliar",
            rota: "/colaboradores",
            ordem: 100,
          });
        }

        // Folha aberta
        if (folhasAbertas.length > 0) {
          novasTarefas.push({
            id: "folha",
            prioridade: "atencao",
            icone: Receipt,
            titulo: `Folha ${folhasAbertas[0].competencia} em aberto`,
            detalhe: "Fechar antes do prazo",
            acao: "Abrir",
            rota: "/folha-pagamento",
            ordem: 15,
          });
        }

        // NFs pendentes
        if (nfs.length > 0) {
          novasTarefas.push({
            id: "nfs",
            prioridade: "atencao",
            icone: FileText,
            titulo: `${nfs.length} nota${nfs.length > 1 ? "s" : ""} fiscal${nfs.length > 1 ? "is" : ""} pendente${nfs.length > 1 ? "s" : ""}`,
            detalhe: "Aguardando processamento financeiro",
            acao: "Processar",
            rota: "/notas-fiscais",
            ordem: 10,
          });
        }

        // Vagas com candidatos para triagem
        const candidatosNovos = candidatos.filter((c) => c.status === "recebido");
        if (candidatosNovos.length > 0) {
          novasTarefas.push({
            id: "triagem",
            prioridade: "normal",
            icone: Users,
            titulo: `${candidatosNovos.length} candidato${candidatosNovos.length > 1 ? "s" : ""} para triagem`,
            detalhe: candidatosNovos.slice(0, 3).map((c) => c.nome).join(", ") +
              (candidatosNovos.length > 3 ? "..." : ""),
            acao: "Ver",
            rota: "/recrutamento",
            ordem: Math.max(...candidatosNovos.map((c) => diasDesde(c.created_at))),
          });
        }

        // Ordenar: urgente > atencao > normal, e por antiguidade dentro de cada nível
        const prioOrder: Record<Prioridade, number> = { urgente: 0, atencao: 1, normal: 2 };
        novasTarefas.sort((a, b) => {
          if (prioOrder[a.prioridade] !== prioOrder[b.prioridade]) {
            return prioOrder[a.prioridade] - prioOrder[b.prioridade];
          }
          return b.ordem - a.ordem;
        });

        setTarefas(novasTarefas);

        // ─── KPIs (só os com valor > 0) ───
        const novosKpis: KpiItem[] = [];
        const convitesPend = convites.filter((c) =>
          ["pendente", "email_enviado"].includes(c.status)
        ).length;
        const onbAndamento = tarefasOnb.length;
        const vagasAbertas = vagas.length;
        const candProcesso = candidatos.length;
        const contratosVencCount = contratosVenc.length;

        if (convitesPend > 0)
          novosKpis.push({ label: "Convites pendentes", valor: convitesPend, icone: Mail, cor: "text-info", rota: "/convites-cadastro" });
        if (onbAndamento > 0)
          novosKpis.push({ label: "Onboardings em andamento", valor: onbAndamento, icone: ClipboardCheck, cor: "text-primary", rota: "/onboarding" });
        if (vagasAbertas > 0)
          novosKpis.push({ label: "Vagas abertas", valor: vagasAbertas, icone: Briefcase, cor: "text-warning", rota: "/recrutamento" });
        if (candProcesso > 0)
          novosKpis.push({ label: "Candidatos em processo", valor: candProcesso, icone: Users, cor: "text-info", rota: "/recrutamento" });
        if (contratosVencCount > 0)
          novosKpis.push({ label: "Contratos PJ vencendo (30d)", valor: contratosVencCount, icone: FileSignature, cor: "text-warning", rota: "/contratos-pj" });

        setKpis(novosKpis);

        // ─── Velocidade (só com 5+ registros) ───
        const novasVelocidades: VelocidadeItem[] = [];
        const convitesPreenchidosComData = convites.filter(
          (c) => c.preenchido_em && c.created_at
        );
        if (convitesPreenchidosComData.length >= 5) {
          const tempos = convitesPreenchidosComData.map((c) => {
            const ms = new Date(c.preenchido_em!).getTime() - new Date(c.created_at).getTime();
            return ms / (1000 * 60 * 60 * 24);
          });
          const medio = tempos.reduce((a, b) => a + b, 0) / tempos.length;
          novasVelocidades.push({
            label: "Tempo médio de preenchimento de convite",
            valor: `${medio.toFixed(1)} dias`,
            icone: Clock,
            detalhe: `Baseado em ${convitesPreenchidosComData.length} convites`,
          });
        }

        const tarefasConcluidasNoPrazo = tarefasOnb.filter(
          (t: any) => t.status === "concluida" && (!t.prazo_data || t.prazo_data >= hojeStr)
        );
        // Se quiser: comparar concluídas total vs no prazo. Mas só temos pendentes/atrasadas aqui — pular se vazio
        // Buscar tudo de onboarding seria query extra; manter simples por ora.

        setVelocidade(novasVelocidades);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [reloadKey]);

  const handleConcluirManual = useCallback(async (sncfId: string) => {
    const { error } = await supabase
      .from("sncf_tarefas")
      .update({ status: "concluida", concluida_em: new Date().toISOString() })
      .eq("id", sncfId);
    if (error) {
      toast.error("Erro ao concluir tarefa");
      return;
    }
    toast.success("Tarefa concluída");
    setReloadKey((k) => k + 1);
  }, []);

  const handleCancelarManual = useCallback(async (sncfId: string) => {
    const { error } = await supabase
      .from("sncf_tarefas")
      .update({ status: "cancelada" })
      .eq("id", sncfId);
    if (error) {
      toast.error("Erro ao cancelar tarefa");
      return;
    }
    toast.success("Tarefa cancelada");
    setReloadKey((k) => k + 1);
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-64 rounded-lg" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-24 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 mt-4">
      {/* Layout lado a lado: Tarefas (60%) + Alertas (40%) */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Coluna esquerda — O que fazer agora */}
        <div className="lg:col-span-3">
          <Card className="card-shadow animate-fade-in h-full">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between gap-2">
                <CardTitle className="text-base flex items-center gap-2">
                  <ClipboardList className="h-4 w-4" style={{ color: FETELY_GREEN }} />
                  O que fazer agora
                </CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setNovaOpen(true)}
                  className="gap-1.5"
                >
                  <Plus className="h-4 w-4" />
                  Nova tarefa
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {tarefas.length === 0 ? (
                <div className="text-center py-12">
                  <CheckCircle2 className="h-12 w-12 mx-auto mb-3" style={{ color: FETELY_GREEN }} />
                  <p className="text-lg font-semibold" style={{ color: FETELY_GREEN }}>
                    Tudo em dia!
                  </p>
                  <p className="text-sm text-muted-foreground">Nenhuma pendência no momento.</p>
                </div>
              ) : (
                <div className="space-y-2">
                {tarefas.map((t) => {
                    const PrioIcon = prioridadeIcon[t.prioridade];
                    const ModuloIcon = t.icone;
                    // Ações diretas que mantêm botão visível
                    const acoesDiretas = ["Aprovar", "Criar"];
                    const mostrarBotaoAcao = !t.manual && acoesDiretas.includes(t.acao);
                    const clicavel = !!t.rota;
                    return (
                      <div
                        key={t.id}
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border bg-card transition-colors",
                          clicavel && "cursor-pointer hover:bg-muted/50"
                        )}
                        onClick={clicavel ? () => navigate(t.rota) : undefined}
                      >
                        <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg shrink-0", prioridadeColor[t.prioridade])}>
                          <PrioIcon className="h-4 w-4" />
                        </div>
                        <ModuloIcon className={cn("h-4 w-4 shrink-0", t.manual ? "text-primary" : "text-muted-foreground")} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium truncate">{t.titulo}</p>
                            {t.manual && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 h-4 shrink-0">
                                Manual
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground truncate">{t.detalhe}</p>
                        </div>
                        {t.manual ? (
                          <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button size="sm" variant="ghost" className="h-8 w-8 p-0">
                                  <MoreVertical className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleConcluirManual(t.sncfId!)}>
                                  <Check className="h-4 w-4 mr-2" /> Concluir
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleCancelarManual(t.sncfId!)}>
                                  <X className="h-4 w-4 mr-2" /> Cancelar
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </div>
                        ) : mostrarBotaoAcao ? (
                          <Button
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(t.rota);
                            }}
                            style={{ backgroundColor: FETELY_GREEN }}
                            className="shrink-0 text-white hover:opacity-90"
                          >
                            {t.acao}
                          </Button>
                        ) : null}
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Coluna direita — Alertas */}
        <div className="lg:col-span-2">
          <Card className="card-shadow animate-fade-in h-full">
            <CardHeader className="pb-3">
              <CardTitle className="text-base flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-warning" />
                Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 max-h-[420px] overflow-y-auto">
              {alertas.length === 0 ? (
                <div className="text-center py-8">
                  <CheckCircle2 className="h-8 w-8 mx-auto mb-2 text-emerald-500" />
                  <p className="text-sm text-muted-foreground">Nenhum alerta no momento</p>
                </div>
              ) : (
                alertas.map((a) => (
                  <div
                    key={a.id}
                    className={cn(
                      "flex items-start gap-3 p-2.5 rounded-lg transition-colors",
                      a.rota && "hover:bg-muted/50 cursor-pointer"
                    )}
                    onClick={a.rota ? () => navigate(a.rota!) : undefined}
                  >
                    <div
                      className={cn(
                        "w-2 h-2 rounded-full mt-1.5 flex-shrink-0",
                        a.prioridade === "alta" && "bg-red-500",
                        a.prioridade === "media" && "bg-yellow-500",
                        a.prioridade === "baixa" && "bg-emerald-500"
                      )}
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-base font-medium">{a.titulo}</p>
                      <p className="text-sm text-muted-foreground">{a.detalhe}</p>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Seção 2: Números do momento */}
      {kpis.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Números do momento
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {kpis.map((kpi) => {
              const Icon = kpi.icone;
              return (
                <Card
                  key={kpi.label}
                  className={cn("card-shadow animate-fade-in", kpi.rota && "cursor-pointer hover:shadow-md transition-shadow")}
                  onClick={kpi.rota ? () => navigate(kpi.rota!) : undefined}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="text-2xl font-bold tracking-tight">{kpi.valor}</p>
                        <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
                      </div>
                      <Icon className={cn("h-5 w-5", kpi.cor)} />
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      {/* Seção 3: Velocidade */}
      {velocidade.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Velocidade
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {velocidade.map((v) => {
              const Icon = v.icone;
              return (
                <Card key={v.label} className="card-shadow animate-fade-in">
                  <CardContent className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-lg font-bold">{v.valor}</p>
                        <p className="text-xs text-muted-foreground">{v.label}</p>
                        {v.detalhe && (
                          <p className="text-xs text-muted-foreground/70 mt-0.5">{v.detalhe}</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}

      <NovaTarefaDialog
        open={novaOpen}
        onOpenChange={setNovaOpen}
        onCreated={() => setReloadKey((k) => k + 1)}
      />
    </div>
  );
}
