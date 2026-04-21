import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type TipoEventoMes = "aniversario" | "tempo_casa";

export interface EventoDoMes {
  /** Chave única para React keys */
  key: string;
  /** ID da pessoa — alvo do DrawerUsuario */
  user_id: string | null;
  /** Dados da pessoa */
  nome: string;
  foto_url: string | null;
  tipo_colaborador: "clt" | "pj";
  /** Departamento da pessoa */
  departamento: string | null;
  /** Evento */
  tipo_evento: TipoEventoMes;
  /** Dia do mês (1-31) */
  dia: number;
  /** Label curto descritivo (ex: "🎂 hoje!", "5 anos de Fetely") */
  label_destaque: string;
  /** É hoje? */
  eh_hoje: boolean;
  /** Subtítulo — ex "3 anos", "aniversário" */
  subtitulo: string;
}

/**
 * Busca aniversariantes e marcos de tempo de casa do mês corrente.
 * Ordenados cronologicamente por dia (1 → 31).
 * Respeita opt-out via mural_preferencias_usuario.
 */
export function useAniversariantesDoMes() {
  return useQuery({
    queryKey: ["aniversariantes-mes", new Date().getMonth() + 1, new Date().getFullYear()],
    queryFn: async (): Promise<EventoDoMes[]> => {
      const hoje = new Date();
      const mesAtual = String(hoje.getMonth() + 1).padStart(2, "0");
      const diaHoje = hoje.getDate();
      const anoAtual = hoje.getFullYear();

      // Busca preferências opt-out
      const { data: preferencias } = await supabase
        .from("mural_preferencias_usuario")
        .select("user_id, aparecer_no_mural");

      const userIdsOptedOut = new Set(
        (preferencias || [])
          .filter((p: any) => p.aparecer_no_mural === false)
          .map((p: any) => p.user_id as string)
      );

      // Busca CLT ativos
      const { data: clts } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, foto_url, user_id, data_nascimento, data_admissao, departamento")
        .eq("status", "ativo");

      // Busca PJ colaboradores ativos
      const { data: pjs } = await supabase
        .from("contratos_pj")
        .select("id, contato_nome, foto_url, user_id, data_nascimento, data_inicio, categoria_pj, departamento")
        .eq("status", "ativo")
        .eq("categoria_pj", "colaborador");

      const eventos: EventoDoMes[] = [];

      // Helper — extrai dia se mês bate
      const extrairDiaSeMesAtual = (dataIso: string | null): number | null => {
        if (!dataIso) return null;
        const [, mes, dia] = dataIso.split("-");
        if (mes !== mesAtual) return null;
        return parseInt(dia, 10);
      };

      // CLT — aniversários + tempo de casa
      (clts || []).forEach((c: any) => {
        if (c.user_id && userIdsOptedOut.has(c.user_id)) return;

        const diaAniv = extrairDiaSeMesAtual(c.data_nascimento);
        if (diaAniv !== null) {
          const ehHoje = diaAniv === diaHoje;
          eventos.push({
            key: `aniv-clt-${c.id}`,
            user_id: c.user_id,
            nome: c.nome_completo,
            foto_url: c.foto_url,
            tipo_colaborador: "clt",
            departamento: c.departamento ?? null,
            tipo_evento: "aniversario",
            dia: diaAniv,
            label_destaque: ehHoje ? "🎂 hoje!" : `dia ${diaAniv}`,
            eh_hoje: ehHoje,
            subtitulo: "aniversário",
          });
        }

        const diaAdm = extrairDiaSeMesAtual(c.data_admissao);
        if (diaAdm !== null && c.data_admissao) {
          const anoAdm = parseInt(c.data_admissao.split("-")[0], 10);
          const anosCasa = anoAtual - anoAdm;
          if ([1, 2, 3, 5, 10].includes(anosCasa)) {
            const ehHoje = diaAdm === diaHoje;
            eventos.push({
              key: `tempo-clt-${c.id}`,
              user_id: c.user_id,
              nome: c.nome_completo,
              foto_url: c.foto_url,
              tipo_colaborador: "clt",
              departamento: c.departamento ?? null,
              tipo_evento: "tempo_casa",
              dia: diaAdm,
              label_destaque: ehHoje ? `🌟 ${anosCasa} anos hoje!` : `dia ${diaAdm}`,
              eh_hoje: ehHoje,
              subtitulo: `${anosCasa} ano${anosCasa > 1 ? "s" : ""} de Fetely`,
            });
          }
        }
      });

      // PJ — aniversários + tempo de casa
      (pjs || []).forEach((p: any) => {
        if (p.user_id && userIdsOptedOut.has(p.user_id)) return;

        const diaAniv = extrairDiaSeMesAtual(p.data_nascimento);
        if (diaAniv !== null) {
          const ehHoje = diaAniv === diaHoje;
          eventos.push({
            key: `aniv-pj-${p.id}`,
            user_id: p.user_id,
            nome: p.contato_nome,
            foto_url: p.foto_url,
            tipo_colaborador: "pj",
            departamento: p.departamento ?? null,
            tipo_evento: "aniversario",
            dia: diaAniv,
            label_destaque: ehHoje ? "🎂 hoje!" : `dia ${diaAniv}`,
            eh_hoje: ehHoje,
            subtitulo: "aniversário",
          });
        }

        const diaInicio = extrairDiaSeMesAtual(p.data_inicio);
        if (diaInicio !== null && p.data_inicio) {
          const anoInicio = parseInt(p.data_inicio.split("-")[0], 10);
          const anosCasa = anoAtual - anoInicio;
          if ([1, 2, 3, 5, 10].includes(anosCasa)) {
            const ehHoje = diaInicio === diaHoje;
            eventos.push({
              key: `tempo-pj-${p.id}`,
              user_id: p.user_id,
              nome: p.contato_nome,
              foto_url: p.foto_url,
              tipo_colaborador: "pj",
              departamento: p.departamento ?? null,
              tipo_evento: "tempo_casa",
              dia: diaInicio,
              label_destaque: ehHoje ? `🌟 ${anosCasa} anos hoje!` : `dia ${diaInicio}`,
              eh_hoje: ehHoje,
              subtitulo: `${anosCasa} ano${anosCasa > 1 ? "s" : ""} de Fetely`,
            });
          }
        }
      });

      // Ordenar cronologicamente. Empate: aniversário antes de tempo_casa.
      eventos.sort((a, b) => {
        if (a.dia !== b.dia) return a.dia - b.dia;
        if (a.tipo_evento === "aniversario" && b.tipo_evento === "tempo_casa") return -1;
        if (a.tipo_evento === "tempo_casa" && b.tipo_evento === "aniversario") return 1;
        return a.nome.localeCompare(b.nome);
      });

      return eventos;
    },
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
  });
}
