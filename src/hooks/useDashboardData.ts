import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useDashboardData() {
  // Total CLT ativos
  const cltQuery = useQuery({
    queryKey: ["dashboard_clt"],
    queryFn: async () => {
      const { count: ativos } = await supabase
        .from("colaboradores_clt")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      const { count: total } = await supabase
        .from("colaboradores_clt")
        .select("*", { count: "exact", head: true });

      // Experiência: admitidos nos últimos 90 dias
      const d90 = new Date();
      d90.setDate(d90.getDate() - 90);
      const { count: experiencia } = await supabase
        .from("colaboradores_clt")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo")
        .gte("data_admissao", d90.toISOString().slice(0, 10));

      return { ativos: ativos ?? 0, total: total ?? 0, experiencia: experiencia ?? 0 };
    },
  });

  // Total PJ ativos
  const pjQuery = useQuery({
    queryKey: ["dashboard_pj"],
    queryFn: async () => {
      const { count: ativos } = await supabase
        .from("contratos_pj")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo");

      // Contratos vencendo nos próximos 30 dias
      const d30 = new Date();
      d30.setDate(d30.getDate() + 30);
      const { count: vencendo } = await supabase
        .from("contratos_pj")
        .select("*", { count: "exact", head: true })
        .eq("status", "ativo")
        .not("data_fim", "is", null)
        .lte("data_fim", d30.toISOString().slice(0, 10));

      return { ativos: ativos ?? 0, vencendo: vencendo ?? 0 };
    },
  });

  // Headcount por departamento
  const headcountQuery = useQuery({
    queryKey: ["dashboard_headcount"],
    queryFn: async () => {
      const { data: cltData } = await supabase
        .from("colaboradores_clt")
        .select("departamento")
        .eq("status", "ativo");

      const { data: pjData } = await supabase
        .from("contratos_pj")
        .select("departamento")
        .eq("status", "ativo");

      const deptMap: Record<string, { clt: number; pj: number }> = {};
      (cltData || []).forEach((c) => {
        deptMap[c.departamento] = deptMap[c.departamento] || { clt: 0, pj: 0 };
        deptMap[c.departamento].clt++;
      });
      (pjData || []).forEach((c) => {
        deptMap[c.departamento] = deptMap[c.departamento] || { clt: 0, pj: 0 };
        deptMap[c.departamento].pj++;
      });

      return Object.entries(deptMap)
        .map(([dept, counts]) => ({ dept, ...counts }))
        .sort((a, b) => (b.clt + b.pj) - (a.clt + a.pj));
    },
  });

  // Férias em gozo
  const feriasQuery = useQuery({
    queryKey: ["dashboard_ferias"],
    queryFn: async () => {
      const today = new Date().toISOString().slice(0, 10);
      const { count: emGozo } = await supabase
        .from("ferias_programacoes")
        .select("*", { count: "exact", head: true })
        .in("status", ["em_gozo", "aprovada"])
        .lte("data_inicio", today)
        .gte("data_fim", today);

      const { count: programadas } = await supabase
        .from("ferias_programacoes")
        .select("*", { count: "exact", head: true })
        .in("status", ["programada", "aprovada"])
        .gt("data_inicio", today);

      const { count: periodoVencido } = await supabase
        .from("ferias_periodos")
        .select("*", { count: "exact", head: true })
        .eq("status", "vencido")
        .gt("saldo", 0);

      return {
        emGozo: emGozo ?? 0,
        programadas: programadas ?? 0,
        periodoVencido: periodoVencido ?? 0,
      };
    },
  });

  // Aniversariantes do mês
  const aniversariantesQuery = useQuery({
    queryKey: ["dashboard_aniversariantes"],
    queryFn: async () => {
      const mes = new Date().getMonth() + 1;
      const { data } = await supabase
        .from("colaboradores_clt")
        .select("nome_completo, data_nascimento, departamento")
        .eq("status", "ativo");

      return (data || [])
        .filter((c) => {
          const m = new Date(c.data_nascimento + "T00:00:00").getMonth() + 1;
          return m === mes;
        })
        .map((c) => ({
          nome: c.nome_completo,
          data: new Date(c.data_nascimento + "T00:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
          depto: c.departamento,
        }))
        .sort((a, b) => a.data.localeCompare(b.data));
    },
  });

  // Status breakdown CLT
  const statusQuery = useQuery({
    queryKey: ["dashboard_status"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores_clt")
        .select("status");

      const counts: Record<string, number> = {};
      (data || []).forEach((c) => {
        counts[c.status] = (counts[c.status] || 0) + 1;
      });

      return counts;
    },
  });

  // Admissões vs Desligamentos (últimos 12 meses)
  const turnoverQuery = useQuery({
    queryKey: ["dashboard_turnover"],
    queryFn: async () => {
      const now = new Date();
      const months: { key: string; label: string; admissoes: number; desligamentos: number }[] = [];
      for (let i = 11; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
        months.push({ key, label: label.charAt(0).toUpperCase() + label.slice(1), admissoes: 0, desligamentos: 0 });
      }

      const startDate = `${months[0].key}-01`;
      const { data: admData } = await supabase
        .from("colaboradores_clt")
        .select("data_admissao")
        .gte("data_admissao", startDate);

      const { data: desData } = await supabase
        .from("colaboradores_clt")
        .select("data_desligamento")
        .not("data_desligamento", "is", null)
        .gte("data_desligamento", startDate);

      (admData || []).forEach((c) => {
        const key = c.data_admissao.slice(0, 7);
        const m = months.find((mo) => mo.key === key);
        if (m) m.admissoes++;
      });

      (desData || []).forEach((c: any) => {
        const key = c.data_desligamento.slice(0, 7);
        const m = months.find((mo) => mo.key === key);
        if (m) m.desligamentos++;
      });

      return months;
    },
  });

  // Folha de pagamento última competência
  const folhaQuery = useQuery({
    queryKey: ["dashboard_folha"],
    queryFn: async () => {
      const { data } = await supabase
        .from("folha_competencias")
        .select("competencia, status, total_bruto, total_liquido, total_colaboradores")
        .order("competencia", { ascending: false })
        .limit(1)
        .single();
      return data;
    },
  });

  // NFs pendentes
  const nfQuery = useQuery({
    queryKey: ["dashboard_nf_pendentes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("notas_fiscais_pj")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      return count ?? 0;
    },
  });

  // Pagamentos PJ pendentes
  const pagPjQuery = useQuery({
    queryKey: ["dashboard_pag_pj_pendentes"],
    queryFn: async () => {
      const { count } = await supabase
        .from("pagamentos_pj")
        .select("*", { count: "exact", head: true })
        .eq("status", "pendente");
      return count ?? 0;
    },
  });

  // Experiência vencendo (45/90 dias)
  const experienciaQuery = useQuery({
    queryKey: ["dashboard_experiencia_vencendo"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores_clt")
        .select("nome_completo, data_admissao, tipo_contrato, departamento")
        .eq("status", "ativo")
        .in("tipo_contrato", ["experiencia", "indeterminado"]);

      const today = new Date();
      const alertas: { nome: string; diasRestantes: number; marco: number; depto: string }[] = [];

      (data || []).forEach((c) => {
        const admissao = new Date(c.data_admissao + "T00:00:00");
        const diffDias = Math.floor((today.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24));

        // Alerta se está entre 35-45 dias (próximo do marco de 45) ou 80-90 dias (próximo do marco de 90)
        if (diffDias >= 35 && diffDias <= 45) {
          alertas.push({ nome: c.nome_completo, diasRestantes: 45 - diffDias, marco: 45, depto: c.departamento });
        } else if (diffDias >= 80 && diffDias <= 90) {
          alertas.push({ nome: c.nome_completo, diasRestantes: 90 - diffDias, marco: 90, depto: c.departamento });
        }
      });

      return alertas;
    },
  });

  // Documentos vencendo (CNH)
  const docsVencendoQuery = useQuery({
    queryKey: ["dashboard_docs_vencendo"],
    queryFn: async () => {
      const d30 = new Date();
      d30.setDate(d30.getDate() + 30);
      const today = new Date().toISOString().slice(0, 10);

      const { data } = await supabase
        .from("colaboradores_clt")
        .select("nome_completo, cnh_validade, departamento")
        .eq("status", "ativo")
        .not("cnh_validade", "is", null)
        .lte("cnh_validade", d30.toISOString().slice(0, 10));

      return (data || []).map((c) => ({
        nome: c.nome_completo,
        documento: "CNH",
        validade: c.cnh_validade!,
        vencido: c.cnh_validade! < today,
        depto: c.departamento,
      }));
    },
  });

  // Aniversários de empresa (marcos de 1, 5, 10, 15, 20, 25, 30 anos) no mês atual
  const anivEmpresaQuery = useQuery({
    queryKey: ["dashboard_aniv_empresa"],
    queryFn: async () => {
      const { data } = await supabase
        .from("colaboradores_clt")
        .select("nome_completo, data_admissao, departamento")
        .eq("status", "ativo");

      const now = new Date();
      const mesAtual = now.getMonth();
      const anoAtual = now.getFullYear();
      const marcos = [1, 5, 10, 15, 20, 25, 30];

      return (data || [])
        .map((c) => {
          const admissao = new Date(c.data_admissao + "T00:00:00");
          if (admissao.getMonth() !== mesAtual) return null;
          const anos = anoAtual - admissao.getFullYear();
          if (!marcos.includes(anos)) return null;
          return {
            nome: c.nome_completo,
            anos,
            data: admissao.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            depto: c.departamento,
          };
        })
        .filter(Boolean) as { nome: string; anos: number; data: string; depto: string }[];
    },
  });

  // Colaboradores ativos sem benefícios
  const semBeneficioQuery = useQuery({
    queryKey: ["dashboard_sem_beneficio"],
    queryFn: async () => {
      const { data: colaboradores } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, departamento")
        .eq("status", "ativo");

      const { data: beneficios } = await supabase
        .from("beneficios_colaborador")
        .select("colaborador_id")
        .eq("status", "ativo");

      const comBeneficio = new Set((beneficios || []).map((b) => b.colaborador_id));

      return (colaboradores || [])
        .filter((c) => !comBeneficio.has(c.id))
        .map((c) => ({ nome: c.nome_completo, depto: c.departamento }));
    },
  });

  const isLoading = cltQuery.isLoading || pjQuery.isLoading || headcountQuery.isLoading;

  return {
    clt: cltQuery.data ?? { ativos: 0, total: 0, experiencia: 0 },
    pj: pjQuery.data ?? { ativos: 0, vencendo: 0 },
    headcount: headcountQuery.data ?? [],
    ferias: feriasQuery.data ?? { emGozo: 0, programadas: 0, periodoVencido: 0 },
    aniversariantes: aniversariantesQuery.data ?? [],
    statusClt: statusQuery.data ?? {},
    turnover: turnoverQuery.data ?? [],
    folha: folhaQuery.data ?? null,
    nfPendentes: nfQuery.data ?? 0,
    pagPjPendentes: pagPjQuery.data ?? 0,
    experienciaVencendo: experienciaQuery.data ?? [],
    docsVencendo: docsVencendoQuery.data ?? [],
    aniversariosEmpresa: anivEmpresaQuery.data ?? [],
    semBeneficio: semBeneficioQuery.data ?? [],
    isLoading,
  };
}
