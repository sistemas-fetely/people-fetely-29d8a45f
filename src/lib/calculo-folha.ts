/**
 * Motor de cálculo de folha de pagamento
 * Todas as alíquotas e faixas são carregadas da tabela de parâmetros
 */

export interface FaixaINSS {
  ate: number;
  aliquota: number;
}

export interface FaixaIRRF {
  ate: number;
  aliquota: number;
  deduzir: number;
}

export interface ParametrosFolha {
  faixasINSS: FaixaINSS[];
  faixasIRRF: FaixaIRRF[];
  aliquotaFGTS: number;
  aliquotaINSSPatronal: number;
  percentualVTDesconto: number;
  deducaoDependenteIRRF: number;
}

// Valores padrão (fallback caso parâmetros não estejam carregados)
export const PARAMETROS_PADRAO: ParametrosFolha = {
  faixasINSS: [
    { ate: 1518.00, aliquota: 0.075 },
    { ate: 2793.88, aliquota: 0.09 },
    { ate: 4190.83, aliquota: 0.12 },
    { ate: 8157.41, aliquota: 0.14 },
  ],
  faixasIRRF: [
    { ate: 2259.20, aliquota: 0, deduzir: 0 },
    { ate: 2826.65, aliquota: 0.075, deduzir: 169.44 },
    { ate: 3751.05, aliquota: 0.15, deduzir: 381.44 },
    { ate: 4664.68, aliquota: 0.225, deduzir: 662.77 },
    { ate: Infinity, aliquota: 0.275, deduzir: 896.00 },
  ],
  aliquotaFGTS: 0.08,
  aliquotaINSSPatronal: 0.20,
  percentualVTDesconto: 0.06,
  deducaoDependenteIRRF: 189.59,
};

export interface DadosCalculo {
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
}

export interface ResultadoCalculo {
  salarioBase: number;
  valorHoraBase: number;
  horasExtras50: number;
  horasExtras100: number;
  adicionalNoturno: number;
  outrosProventos: number;
  totalProventos: number;
  inss: number;
  irrf: number;
  vtDesconto: number;
  vrDesconto: number;
  planoSaude: number;
  faltasDesconto: number;
  outrosDescontos: number;
  totalDescontos: number;
  salarioLiquido: number;
  fgts: number;
  inssPatronal: number;
  totalEncargos: number;
  horasExtras50Qtd: number;
  horasExtras100Qtd: number;
  faltasDias: number;
}

export function calcularINSS(baseCalculo: number, faixas: FaixaINSS[]): number {
  let inss = 0;
  let anterior = 0;
  for (const faixa of faixas) {
    if (baseCalculo <= anterior) break;
    const teto = Math.min(baseCalculo, faixa.ate);
    inss += (teto - anterior) * faixa.aliquota;
    anterior = faixa.ate;
  }
  return Math.round(inss * 100) / 100;
}

export function calcularIRRF(baseCalculo: number, numDependentes: number, faixas: FaixaIRRF[], deducaoDependente: number): number {
  const deducaoDep = numDependentes * deducaoDependente;
  const base = baseCalculo - deducaoDep;
  if (base <= 0) return 0;

  for (const faixa of faixas) {
    if (base <= faixa.ate) {
      const irrf = base * faixa.aliquota - faixa.deduzir;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }
  return 0;
}

export function calcularFolha(dados: DadosCalculo, params: ParametrosFolha = PARAMETROS_PADRAO): ResultadoCalculo {
  const jornada = dados.jornadaMensal || 220;
  const valorHora = dados.salarioBase / jornada;

  const horasExtras50 = Math.round(dados.horasExtras50Qtd * valorHora * 1.5 * 100) / 100;
  const horasExtras100 = Math.round(dados.horasExtras100Qtd * valorHora * 2 * 100) / 100;
  const faltasDesconto = Math.round(dados.faltasDias * (dados.salarioBase / 30) * 100) / 100;

  const remuneracaoTotal = dados.salarioBase + horasExtras50 + horasExtras100 + dados.outrosProventos - faltasDesconto;
  const totalProventos = dados.salarioBase + horasExtras50 + horasExtras100 + dados.outrosProventos;

  const inss = calcularINSS(remuneracaoTotal, params.faixasINSS);
  const baseIRRF = remuneracaoTotal - inss;
  const irrf = calcularIRRF(baseIRRF, dados.numDependentes, params.faixasIRRF, params.deducaoDependenteIRRF);

  const vtDesconto = dados.descontoVT ? Math.round(dados.salarioBase * params.percentualVTDesconto * 100) / 100 : 0;

  const totalDescontos = inss + irrf + vtDesconto + dados.descontoVR + dados.descontoPlanoSaude + faltasDesconto + dados.outrosDescontos;
  const salarioLiquido = Math.round((totalProventos - totalDescontos) * 100) / 100;

  const fgts = Math.round(remuneracaoTotal * params.aliquotaFGTS * 100) / 100;
  const inssPatronal = Math.round(remuneracaoTotal * params.aliquotaINSSPatronal * 100) / 100;
  const totalEncargos = fgts + inssPatronal;

  return {
    salarioBase: dados.salarioBase,
    valorHoraBase: Math.round(valorHora * 100) / 100,
    horasExtras50,
    horasExtras100,
    adicionalNoturno: 0,
    outrosProventos: dados.outrosProventos,
    totalProventos: Math.round(totalProventos * 100) / 100,
    inss,
    irrf,
    vtDesconto,
    vrDesconto: dados.descontoVR,
    planoSaude: dados.descontoPlanoSaude,
    faltasDesconto,
    outrosDescontos: dados.outrosDescontos,
    totalDescontos: Math.round(totalDescontos * 100) / 100,
    salarioLiquido,
    fgts,
    inssPatronal,
    totalEncargos: Math.round(totalEncargos * 100) / 100,
    horasExtras50Qtd: dados.horasExtras50Qtd,
    horasExtras100Qtd: dados.horasExtras100Qtd,
    faltasDias: dados.faltasDias,
  };
}
