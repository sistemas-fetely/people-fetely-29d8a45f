import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { calcularFolha, type DadosCalculo, type ParametrosFolha, PARAMETROS_PADRAO } from "@/lib/calculo-folha";
import { toast } from "sonner";
import type { Tables } from "@/integrations/supabase/types";

type Competencia = Tables<"folha_competencias">;
type Holerite = Tables<"holerites">;

export interface HoleriteComColaborador extends Holerite {
  colaborador?: {
    nome_completo: string;
    cpf: string;
    cargo: string;
    departamento: string;
    jornada_semanal: number | null;
  };
}

export function useCompetencias() {
  return useQuery({
    queryKey: ["folha_competencias"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("folha_competencias")
        .select("*")
        .order("competencia", { ascending: false });
      if (error) throw error;
      return data as Competencia[];
    },
  });
}

export function useHolerites(competenciaId: string | null) {
  return useQuery({
    queryKey: ["holerites", competenciaId],
    enabled: !!competenciaId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("holerites")
        .select("*, colaboradores_clt!inner(nome_completo, cpf, cargo, departamento, jornada_semanal)")
        .eq("competencia_id", competenciaId!);
      if (error) throw error;
      return (data || []).map((h: any) => ({
        ...h,
        colaborador: h.colaboradores_clt,
      })) as HoleriteComColaborador[];
    },
  });
}

export function useCriarCompetencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competencia: string) => {
      const { data, error } = await supabase
        .from("folha_competencias")
        .insert({ competencia })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folha_competencias"] });
      toast.success("Competência criada com sucesso");
    },
    onError: (e: any) => {
      if (e.message?.includes("duplicate")) {
        toast.error("Esta competência já existe");
      } else {
        toast.error("Erro ao criar competência");
      }
    },
  });
}

export function useCalcularFolha() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ competenciaId, params }: { competenciaId: string; params?: ParametrosFolha }) => {
      const parametros = params || PARAMETROS_PADRAO;
      // 1. Buscar todos colaboradores ativos
      const { data: colaboradores, error: colErr } = await supabase
        .from("colaboradores_clt")
        .select("id, nome_completo, salario_base, jornada_semanal, departamento")
        .eq("status", "ativo");
      if (colErr) throw colErr;
      if (!colaboradores?.length) throw new Error("Nenhum colaborador ativo encontrado");

      // 2. Buscar dependentes para IRRF
      const colIds = colaboradores.map((c) => c.id);
      const { data: dependentes } = await supabase
        .from("dependentes")
        .select("colaborador_id, incluir_irrf")
        .in("colaborador_id", colIds)
        .eq("incluir_irrf", true);

      const depCount: Record<string, number> = {};
      dependentes?.forEach((d) => {
        depCount[d.colaborador_id] = (depCount[d.colaborador_id] || 0) + 1;
      });

      // 3. Calcular cada holerite
      const holerites = colaboradores.map((col) => {
        const dados: DadosCalculo = {
          salarioBase: Number(col.salario_base),
          horasExtras50Qtd: 0,
          horasExtras100Qtd: 0,
          faltasDias: 0,
          jornadaMensal: (col.jornada_semanal || 44) * (220 / 44),
          numDependentes: depCount[col.id] || 0,
          descontoVT: true,
          descontoVR: 0,
          descontoPlanoSaude: 0,
          outrosProventos: 0,
          outrosDescontos: 0,
        };
        const calc = calcularFolha(dados, parametros);
        return {
          competencia_id: competenciaId,
          colaborador_id: col.id,
          salario_base: calc.salarioBase,
          horas_extras_50: calc.horasExtras50,
          horas_extras_100: calc.horasExtras100,
          adicional_noturno: calc.adicionalNoturno,
          outros_proventos: calc.outrosProventos,
          inss: calc.inss,
          irrf: calc.irrf,
          vt_desconto: calc.vtDesconto,
          vr_desconto: calc.vrDesconto,
          plano_saude: calc.planoSaude,
          faltas_desconto: calc.faltasDesconto,
          outros_descontos: calc.outrosDescontos,
          fgts: calc.fgts,
          inss_patronal: calc.inssPatronal,
          total_proventos: calc.totalProventos,
          total_descontos: calc.totalDescontos,
          salario_liquido: calc.salarioLiquido,
          total_encargos: calc.totalEncargos,
          horas_extras_50_qtd: calc.horasExtras50Qtd,
          horas_extras_100_qtd: calc.horasExtras100Qtd,
          faltas_dias: calc.faltasDias,
        };
      });

      // 4. Deletar holerites antigos desta competência e inserir novos
      const { error: delErr } = await supabase.from("holerites").delete().eq("competencia_id", competenciaId);
      if (delErr) {
        console.error("Erro ao deletar holerites antigos:", delErr);
        throw new Error("Erro ao limpar holerites anteriores: " + delErr.message);
      }

      const { error: insErr } = await supabase.from("holerites").insert(holerites);
      if (insErr) {
        console.error("Erro ao inserir holerites:", insErr);
        throw new Error("Erro ao salvar holerites: " + insErr.message);
      }

      // 5. Atualizar totais da competência
      const totalBruto = holerites.reduce((s, h) => s + h.total_proventos, 0);
      const totalLiquido = holerites.reduce((s, h) => s + h.salario_liquido, 0);
      const totalEncargos = holerites.reduce((s, h) => s + h.total_encargos, 0);

      const { error: updErr } = await supabase
        .from("folha_competencias")
        .update({
          status: "calculada",
          total_bruto: totalBruto,
          total_liquido: totalLiquido,
          total_encargos: totalEncargos,
          total_colaboradores: holerites.length,
        })
        .eq("id", competenciaId);
      if (updErr) {
        console.error("Erro ao atualizar competência:", updErr);
      }

      return { total: holerites.length };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["folha_competencias"] });
      qc.invalidateQueries({ queryKey: ["holerites"] });
      toast.success(`Folha calculada para ${data.total} colaboradores`);
    },
    onError: (e: any) => {
      toast.error(e.message || "Erro ao calcular folha");
    },
  });
}

export function useFecharCompetencia() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (competenciaId: string) => {
      const { error } = await supabase
        .from("folha_competencias")
        .update({ status: "fechada" })
        .eq("id", competenciaId);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["folha_competencias"] });
      toast.success("Competência fechada");
    },
    onError: () => toast.error("Erro ao fechar competência"),
  });
}

export interface EditarHoleriteInput {
  holeriteId: string;
  competenciaId: string;
  colaboradorId: string;
  salarioBase: number;
  horasExtras50Qtd: number;
  horasExtras100Qtd: number;
  faltasDias: number;
  jornadaMensal: number;
  numDependentes: number;
  descontoVT: boolean;
  descontoVR: number;
  descontoPlanoSaude: number;
  outrosProventos: number;
  outrosDescontos: number;
  params?: ParametrosFolha;
}

export function useEditarHolerite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: EditarHoleriteInput) => {
      const dados: DadosCalculo = {
        salarioBase: input.salarioBase,
        horasExtras50Qtd: input.horasExtras50Qtd,
        horasExtras100Qtd: input.horasExtras100Qtd,
        faltasDias: input.faltasDias,
        jornadaMensal: input.jornadaMensal,
        numDependentes: input.numDependentes,
        descontoVT: input.descontoVT,
        descontoVR: input.descontoVR,
        descontoPlanoSaude: input.descontoPlanoSaude,
        outrosProventos: input.outrosProventos,
        outrosDescontos: input.outrosDescontos,
      };
      const calc = calcularFolha(dados, input.params);

      const { error } = await supabase
        .from("holerites")
        .update({
          salario_base: calc.salarioBase,
          horas_extras_50: calc.horasExtras50,
          horas_extras_100: calc.horasExtras100,
          adicional_noturno: calc.adicionalNoturno,
          outros_proventos: calc.outrosProventos,
          inss: calc.inss,
          irrf: calc.irrf,
          vt_desconto: calc.vtDesconto,
          vr_desconto: calc.vrDesconto,
          plano_saude: calc.planoSaude,
          faltas_desconto: calc.faltasDesconto,
          outros_descontos: calc.outrosDescontos,
          fgts: calc.fgts,
          inss_patronal: calc.inssPatronal,
          total_proventos: calc.totalProventos,
          total_descontos: calc.totalDescontos,
          salario_liquido: calc.salarioLiquido,
          total_encargos: calc.totalEncargos,
          horas_extras_50_qtd: calc.horasExtras50Qtd,
          horas_extras_100_qtd: calc.horasExtras100Qtd,
          faltas_dias: calc.faltasDias,
        })
        .eq("id", input.holeriteId);
      if (error) throw error;

      // Recalcular totais da competência
      const { data: allH } = await supabase
        .from("holerites")
        .select("total_proventos, salario_liquido, total_encargos")
        .eq("competencia_id", input.competenciaId);

      if (allH) {
        const totalBruto = allH.reduce((s, h) => s + (h.total_proventos ?? 0), 0);
        const totalLiquido = allH.reduce((s, h) => s + (h.salario_liquido ?? 0), 0);
        const totalEncargos = allH.reduce((s, h) => s + (h.total_encargos ?? 0), 0);
        await supabase
          .from("folha_competencias")
          .update({ total_bruto: totalBruto, total_liquido: totalLiquido, total_encargos: totalEncargos })
          .eq("id", input.competenciaId);
      }

      return calc;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["holerites"] });
      qc.invalidateQueries({ queryKey: ["folha_competencias"] });
      toast.success("Holerite atualizado e recalculado");
    },
    onError: () => toast.error("Erro ao atualizar holerite"),
  });
}
