/**
 * Hook que detecta CNPJs ainda não cadastrados em uma lista de NFs e gerencia
 * a fila de auto-cadastro de parceiros antes de seguir com a importação.
 *
 * Fluxo:
 *  1. Caller chama `prepararFila(nfs)` antes de importar.
 *  2. Hook detecta quais CNPJs não existem na base.
 *  3. Caller renderiza <ParceiroFormSheet> obrigatório com `cnpjAtual` e `prefillAtual`.
 *  4. Quando usuário cadastra (onSaved), caller chama `avancarFila(parceiroId)`.
 *  5. Quando fila acaba (cnpjAtual === null), caller chama `importarNFs(nfs)` normalmente.
 */
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import type { NFParsed } from "@/lib/financeiro/types";

interface FornecedorPendente {
  cnpj: string;
  razao_social: string;
  // Indices das NFs no array original que usam esse CNPJ (para hidratar parceiro_id depois)
  indicesNF: number[];
}

export function useFilaAutoCadastroParceiro() {
  const [fila, setFila] = useState<FornecedorPendente[]>([]);
  const [posicao, setPosicao] = useState(0);

  const itemAtual = fila[posicao] ?? null;
  const totalFila = fila.length;
  const filaAtiva = totalFila > 0 && posicao < totalFila;

  /**
   * Verifica todas as NFs e retorna os CNPJs que precisam de cadastro.
   * Retorna o array de NFs já com parceiro_id setado para CNPJs que JÁ existem.
   */
  async function prepararFila(nfs: NFParsed[]): Promise<{
    nfs: NFParsed[];
    precisaCadastrar: boolean;
  }> {
    // Coletar CNPJs únicos das NFs
    const cnpjsPorIndice = new Map<string, number[]>();
    nfs.forEach((nf, idx) => {
      if (nf.fornecedor_cnpj) {
        const lista = cnpjsPorIndice.get(nf.fornecedor_cnpj) || [];
        lista.push(idx);
        cnpjsPorIndice.set(nf.fornecedor_cnpj, lista);
      }
    });

    if (cnpjsPorIndice.size === 0) {
      // Nenhum CNPJ nas NFs - segue direto
      return { nfs, precisaCadastrar: false };
    }

    const cnpjs = Array.from(cnpjsPorIndice.keys());
    const { data: existentes } = await supabase
      .from("parceiros_comerciais")
      .select("id, cnpj")
      .in("cnpj", cnpjs);

    const mapaExistentes = new Map<string, string>();
    (existentes || []).forEach((p) => {
      if (p.cnpj) mapaExistentes.set(p.cnpj, p.id);
    });

    // Hidratar nfs com parceiro_id dos que JÁ existem (interno via _parceiro_id_resolvido)
    const nfsHidratadas = nfs.map((nf) => {
      if (nf.fornecedor_cnpj && mapaExistentes.has(nf.fornecedor_cnpj)) {
        return { ...nf, _parceiro_id_resolvido: mapaExistentes.get(nf.fornecedor_cnpj) };
      }
      return nf;
    });

    // Pendentes: CNPJs que não existem ainda
    const pendentes: FornecedorPendente[] = [];
    cnpjsPorIndice.forEach((indices, cnpj) => {
      if (!mapaExistentes.has(cnpj)) {
        const primeira = nfs[indices[0]];
        pendentes.push({
          cnpj,
          razao_social: primeira.fornecedor_nome,
          indicesNF: indices,
        });
      }
    });

    if (pendentes.length === 0) {
      return { nfs: nfsHidratadas, precisaCadastrar: false };
    }

    setFila(pendentes);
    setPosicao(0);
    return { nfs: nfsHidratadas, precisaCadastrar: true };
  }

  /**
   * Aplica o parceiro_id recém-cadastrado nas NFs correspondentes e
   * avança para o próximo item da fila.
   */
  function avancarFila(
    nfsAtuais: NFParsed[],
    parceiroIdCadastrado: string,
  ): NFParsed[] {
    if (!itemAtual) return nfsAtuais;

    const nfsAtualizadas = nfsAtuais.map((nf, idx) => {
      if (itemAtual.indicesNF.includes(idx)) {
        return { ...nf, _parceiro_id_resolvido: parceiroIdCadastrado };
      }
      return nf;
    });

    setPosicao((p) => p + 1);
    return nfsAtualizadas;
  }

  function cancelarFila() {
    setFila([]);
    setPosicao(0);
  }

  return {
    itemAtual,
    posicao,
    totalFila,
    filaAtiva,
    prepararFila,
    avancarFila,
    cancelarFila,
  };
}
