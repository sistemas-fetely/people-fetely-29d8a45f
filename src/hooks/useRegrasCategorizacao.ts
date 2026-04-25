import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import type { ItemNFParsed, NFParsed, RegraCategorizacao } from "@/lib/financeiro/types";

export function useRegrasCategorizacao() {
  return useQuery({
    queryKey: ["regras-categorizacao"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("regras_categorizacao")
        .select("*, conta:plano_contas(id, codigo, nome)")
        .eq("ativo", true)
        .order("prioridade", { ascending: true });
      if (error) throw error;
      return (data || []) as unknown as RegraCategorizacao[];
    },
    staleTime: 60_000,
  });
}

/**
 * Aplica regras de categorização a uma NF parseada.
 * Ordem: parceiro (CNPJ) > NCM > texto > nada.
 */
export function aplicarRegras(nf: NFParsed, regras: RegraCategorizacao[] | undefined): NFParsed {
  if (!regras || regras.length === 0) {
    return { ...nf, _categoria_id: null, _categoria_nome: null, _regra_origem: null };
  }

  // 1. Regra por CNPJ do parceiro
  if (nf.fornecedor_cnpj) {
    const r = regras.find((x) => x.cnpj_emitente && x.cnpj_emitente === nf.fornecedor_cnpj);
    if (r && r.conta) {
      return {
        ...nf,
        _categoria_id: r.conta_plano_id,
        _categoria_nome: `${r.conta.codigo} — ${r.conta.nome}`,
        _centro_custo: r.centro_custo,
        _regra_origem: "parceiro",
      };
    }
  }

  // 2. Regra por NCM (prefixo)
  if (nf.nf_ncm) {
    const r = regras.find((x) => x.ncm_prefixo && nf.nf_ncm!.startsWith(x.ncm_prefixo));
    if (r && r.conta) {
      return {
        ...nf,
        _categoria_id: r.conta_plano_id,
        _categoria_nome: `${r.conta.codigo} — ${r.conta.nome}`,
        _centro_custo: r.centro_custo,
        _regra_origem: "ncm",
      };
    }
  }

  // 3. Regra por descrição contém
  const descricaoBusca = `${nf.fornecedor_nome} ${nf.nf_natureza_operacao || ""}`.toLowerCase();
  const r = regras.find(
    (x) => x.descricao_contem && descricaoBusca.includes(x.descricao_contem.toLowerCase())
  );
  if (r && r.conta) {
    return {
      ...nf,
      _categoria_id: r.conta_plano_id,
      _categoria_nome: `${r.conta.codigo} — ${r.conta.nome}`,
      _centro_custo: r.centro_custo,
      _regra_origem: "texto",
    };
  }

  return { ...nf, _categoria_id: null, _categoria_nome: null, _regra_origem: null };
}
