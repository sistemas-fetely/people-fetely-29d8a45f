/**
 * Parser de XML NFS-e (Nota Fiscal de Serviço Eletrônica)
 * Padrão ABRASF 2.02 — extração 100% no navegador.
 */

import type { NFParsed } from "./types";
import { limparCnpj, parseValorBR } from "./parsers";

function getText(root: Document | Element, selectors: string[]): string {
  for (const sel of selectors) {
    const el = root.querySelector(sel);
    const txt = el?.textContent?.trim();
    if (txt) return txt;
  }
  return "";
}

export function parseNFSeXml(xmlText: string): NFParsed | null {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const parserError = xmlDoc.querySelector("parsererror");
  if (parserError) {
    throw new Error("XML inválido");
  }

  // Aceita Nfse, CompNfse ou InfNfse como raiz NFS-e
  const nfse = xmlDoc.querySelector("Nfse, CompNfse, InfNfse, NFSe, ConsultarNfseResposta");
  if (!nfse) {
    throw new Error("XML não é uma NFS-e válida (padrão ABRASF)");
  }

  const numero = getText(xmlDoc, ["InfNfse > Numero", "Numero"]);
  const dataEmissao = getText(xmlDoc, ["DataEmissao", "DataEmissaoRps"]);
  const valorLiquidoStr = getText(xmlDoc, [
    "ValorLiquidoNfse",
    "Valores > ValorLiquidoNfse",
    "Valores > ValorServicos",
    "ValorServicos",
  ]);

  const cnpjPrestador = getText(xmlDoc, [
    "PrestadorServico CpfCnpj Cnpj",
    "Prestador CpfCnpj Cnpj",
    "PrestadorServico IdentificacaoPrestador Cnpj",
    "IdentificacaoPrestador Cnpj",
  ]);

  const razaoSocialPrestador = getText(xmlDoc, [
    "PrestadorServico RazaoSocial",
    "Prestador RazaoSocial",
    "DadosPrestador RazaoSocial",
  ]);

  const discriminacao = getText(xmlDoc, ["Discriminacao"]);
  const codigoVerificacao = getText(xmlDoc, ["CodigoVerificacao"]);

  if (!numero || !razaoSocialPrestador) {
    throw new Error("XML NFS-e incompleto (faltam número ou razão social do prestador)");
  }

  // Converte data ISO → YYYY-MM-DD
  let dataFormatada: string | null = null;
  if (dataEmissao) {
    const match = dataEmissao.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (match) {
      dataFormatada = `${match[1]}-${match[2]}-${match[3]}`;
    }
  }

  const valor = parseValorBR(valorLiquidoStr);

  return {
    nf_numero: numero,
    nf_chave_acesso: codigoVerificacao || undefined,
    nf_data_emissao: dataFormatada,
    fornecedor_nome: razaoSocialPrestador,
    fornecedor_cnpj: limparCnpj(cnpjPrestador),
    valor,
    nf_valor_produtos: valor,
    nf_natureza_operacao: discriminacao
      ? discriminacao.substring(0, 200)
      : "Serviço",
    meio_pagamento: null,
    _source: "xml_nfse",
  };
}
