/**
 * Parser de XML NFS-e padrão ABRASF v2.02 (frontend, DOMParser)
 *
 * Cobertura: NFS-e seguindo o padrão nacional ABRASF.
 * Aproximadamente 70% dos municípios brasileiros usam ABRASF.
 *
 * Não cobre: NFS-e de São Paulo Capital, Rio de Janeiro, e outras
 * cidades com schema próprio. Esses casos retornam null e ficam
 * pra sprint dedicada quando virarem dor real.
 */

import type { ItemNFParsed, NFParsed } from "./types";

const ABRASF_NS = "http://www.abrasf.org.br/nfse.xsd";

function tag(parent: Element | null | undefined, name: string): string {
  if (!parent) return "";
  const el =
    parent.getElementsByTagNameNS(ABRASF_NS, name)[0] ||
    parent.getElementsByTagName(name)[0];
  return el ? (el.textContent || "").trim() : "";
}

function firstChild(parent: Element | Document | null, name: string): Element | null {
  if (!parent) return null;
  const el =
    (parent as any).getElementsByTagNameNS?.(ABRASF_NS, name)[0] ||
    (parent as any).getElementsByTagName?.(name)[0];
  return (el as Element) || null;
}

/**
 * Detecta se XML é NFS-e ABRASF
 */
export function isXmlNFSeAbrasf(xmlString: string): boolean {
  if (!xmlString) return false;
  const lower = xmlString.toLowerCase();
  // Sinais fortes: namespace ABRASF + raiz CompNfse
  return (
    lower.includes("abrasf.org.br/nfse") &&
    (lower.includes("<compnfse") || lower.includes(":compnfse"))
  );
}

/**
 * Extrai chave única da NFS-e:
 * 1. InfNfse Id (43 caracteres, padrão ABRASF) — preferida
 * 2. Síntese: "NFSE-" + CNPJ_prestador + "-" + numero + "-" + data
 */
function extrairChave(infNfse: Element, cnpjPrestador: string, numero: string, dataEmissao: string): string {
  const idAttr = infNfse.getAttribute("Id");
  if (idAttr && idAttr.trim().length > 0) {
    return idAttr.trim();
  }
  return `NFSE-${cnpjPrestador}-${numero}-${(dataEmissao || "").slice(0, 10)}`;
}

export function parseNFSeXml(xmlString: string): NFParsed | null {
  if (!xmlString || !xmlString.trim()) return null;
  if (!isXmlNFSeAbrasf(xmlString)) return null;

  const parser = new DOMParser();
  const doc = parser.parseFromString(xmlString, "text/xml");

  // Procura InfNfse (raiz lógica)
  const infNfse = firstChild(doc, "InfNfse");
  if (!infNfse) return null;

  // Identificação
  const numero = tag(infNfse, "Numero");
  const codigoVerificacao = tag(infNfse, "CodigoVerificacao");
  const dataEmissao = tag(infNfse, "DataEmissao");

  // Prestador (= fornecedor da Fetely)
  const prestador = firstChild(infNfse, "PrestadorServico");
  const idPrestador = firstChild(prestador, "IdentificacaoPrestador");
  const cpfCnpjPrestador = firstChild(idPrestador, "CpfCnpj");
  const cnpjPrestador =
    tag(cpfCnpjPrestador, "Cnpj") || tag(cpfCnpjPrestador, "Cpf");
  const razaoPrestador = tag(prestador, "RazaoSocial");

  if (!cnpjPrestador && !razaoPrestador) {
    return null; // Sem identificação do prestador, descarta
  }

  // Valores — em NFS-e o valor principal é ValorLiquidoNfse ou ValorServicos
  const valoresNfse = firstChild(infNfse, "ValoresNfse");
  const valorLiquido = parseFloat(tag(valoresNfse, "ValorLiquidoNfse")) || 0;

  // Discriminação e item de serviço (vem dentro de DeclaracaoPrestacaoServico)
  const decl = firstChild(infNfse, "DeclaracaoPrestacaoServico");
  const infDecl = firstChild(decl, "InfDeclaracaoPrestacaoServico");
  const servico = firstChild(infDecl, "Servico");
  const valoresServico = firstChild(servico, "Valores");
  const valorServicos = parseFloat(tag(valoresServico, "ValorServicos")) || 0;
  const valorPis = parseFloat(tag(valoresServico, "ValorPis")) || 0;
  const valorCofins = parseFloat(tag(valoresServico, "ValorCofins")) || 0;
  const valorCsll = parseFloat(tag(valoresServico, "ValorCsll")) || 0;
  const valorIss = parseFloat(tag(valoresServico, "ValorIss")) || 0;

  const valorImpostos = valorPis + valorCofins + valorCsll + valorIss;
  const valorFinal = valorLiquido > 0 ? valorLiquido : valorServicos;

  const discriminacao = tag(servico, "Discriminacao");
  const itemListaServico = tag(servico, "ItemListaServico");

  // Chave única
  const chave = extrairChave(infNfse as Element, cnpjPrestador, numero, dataEmissao);

  // Para NFS-e, criamos UM item sintético com a discriminação completa.
  // (NFS-e não tem itens granulares como NF-e produto)
  const itens: ItemNFParsed[] = [];
  if (discriminacao || valorServicos > 0) {
    itens.push({
      codigo_produto: itemListaServico || "",
      descricao: discriminacao || "Serviço",
      ncm: itemListaServico || "", // reutiliza campo ncm pra código municipal de serviço
      cfop: "",
      unidade: "SV",
      quantidade: 1,
      valor_unitario: valorServicos,
      valor_total: valorServicos,
    });
  }

  return {
    nf_chave_acesso: chave,
    nf_numero: numero,
    nf_serie: codigoVerificacao || "",
    nf_data_emissao: dataEmissao ? dataEmissao.substring(0, 10) : null,
    nf_natureza_operacao: "Prestação de Serviço",
    nf_cfop: "",
    nf_ncm: itemListaServico || "",
    fornecedor_nome: razaoPrestador,
    fornecedor_cnpj: cnpjPrestador.replace(/\D/g, ""),
    valor: valorFinal,
    nf_valor_produtos: valorServicos,
    nf_valor_impostos: valorImpostos,
    itens,
    // Campos novos (tipo_documento, pais_emissor, moeda) ficam pra dispatcher decidir
    _source: "xml_nfse",
  } as NFParsed & { _source: string };
}
