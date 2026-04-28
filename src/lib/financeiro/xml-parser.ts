/**
 * Dispatcher unificado de XML fiscal.
 *
 * Detecta tipo do XML (NF-e produto ou NFS-e ABRASF) e chama o
 * parser correspondente. Frontend usa esta função sempre que
 * receber um arquivo .xml — não precisa saber o tipo.
 *
 * Doutrina: 1 botão "Importar XML" na UI. Sistema detecta sozinho.
 */

import type { NFParsed } from "./types";
import { parseNFeXml } from "./xml-nfe-parser";
import { parseNFSeXml, isXmlNFSeAbrasf } from "./xml-nfse-parser";

export type TipoXmlDetectado = "nfe" | "nfse" | "desconhecido";

/**
 * Detecta tipo do XML pela raiz e namespace.
 */
export function detectarTipoXml(xmlString: string): TipoXmlDetectado {
  if (!xmlString) return "desconhecido";

  if (isXmlNFSeAbrasf(xmlString)) {
    return "nfse";
  }

  // NF-e produto: namespace nfe.fazenda + raiz <NFe> ou <nfeProc>
  const lower = xmlString.toLowerCase();
  if (
    lower.includes("portalfiscal.inf.br/nfe") &&
    (lower.includes("<nfe") || lower.includes("<nfeproc"))
  ) {
    return "nfe";
  }

  return "desconhecido";
}

/**
 * Parser unificado: recebe XML, devolve NFParsed enriquecido com
 * tipo_documento, pais_emissor e moeda.
 *
 * Retorna null se XML não for reconhecido (NFS-e SP/Rio com schema
 * próprio, XML corrompido, etc.).
 */
export function parseXmlAny(xmlString: string): NFParsed | null {
  const tipo = detectarTipoXml(xmlString);

  if (tipo === "nfe") {
    const nf = parseNFeXml(xmlString);
    if (!nf) return null;
    return {
      ...nf,
      tipo_documento: "nfe",
      pais_emissor: "BR",
      moeda: "BRL",
    } as NFParsed & { tipo_documento: string; pais_emissor: string; moeda: string };
  }

  if (tipo === "nfse") {
    const nf = parseNFSeXml(xmlString);
    if (!nf) return null;
    return {
      ...nf,
      tipo_documento: "nfse",
      pais_emissor: "BR",
      moeda: "BRL",
    } as NFParsed & { tipo_documento: string; pais_emissor: string; moeda: string };
  }

  return null;
}
