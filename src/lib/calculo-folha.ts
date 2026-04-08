/**
 * Motor de cálculo de folha de pagamento
 * Tabelas vigentes 2026 (valores aproximados — ajustar conforme legislação)
 */

// Faixas INSS 2026
const FAIXAS_INSS = [
  { ate: 1518.00, aliquota: 0.075 },
  { ate: 2793.88, aliquota: 0.09 },
  { ate: 4190.83, aliquota: 0.12 },
  { ate: 8157.41, aliquota: 0.14 },
];

// Faixas IRRF 2026
const FAIXAS_IRRF = [
  { ate: 2259.20, aliquota: 0, deduzir: 0 },
  { ate: 2826.65, aliquota: 0.075, deduzir: 169.44 },
  { ate: 3751.05, aliquota: 0.15, deduzir: 381.44 },
  { ate: 4664.68, aliquota: 0.225, deduzir: 662.77 },
  { ate: Infinity, aliquota: 0.275, deduzir: 896.00 },
];

const DEDUCAO_DEPENDENTE_IRRF = 189.59;
const ALIQUOTA_FGTS = 0.08;
const ALIQUOTA_INSS_PATRONAL = 0.20; // simplificado
const PERCENTUAL_VT_DESCONTO = 0.06; // 6% do salário base

export interface DadosCalculo {
  salarioBase: number;
  horasExtras50Qtd: number;
  horasExtras100Qtd: number;
  faltasDias: number;
  jornadaMensal: number; // horas mensais (padrão 220)
  numDependentes: number;
  descontoVT: boolean;
  descontoVR: number; // valor fixo
  descontoPlanoSaude: number; // valor fixo
  outrosProventos: number;
  outrosDescontos: number;
}

export interface ResultadoCalculo {
  salarioBase: number;
  valorHoraBase: number;
  // Proventos
  horasExtras50: number;
  horasExtras100: number;
  adicionalNoturno: number;
  outrosProventos: number;
  totalProventos: number;
  // Descontos
  inss: number;
  irrf: number;
  vtDesconto: number;
  vrDesconto: number;
  planoSaude: number;
  faltasDesconto: number;
  outrosDescontos: number;
  totalDescontos: number;
  // Líquido
  salarioLiquido: number;
  // Encargos
  fgts: number;
  inssPatronal: number;
  totalEncargos: number;
  // Referências
  horasExtras50Qtd: number;
  horasExtras100Qtd: number;
  faltasDias: number;
}

export function calcularINSS(baseCalculo: number): number {
  let inss = 0;
  let anterior = 0;
  for (const faixa of FAIXAS_INSS) {
    if (baseCalculo <= anterior) break;
    const teto = Math.min(baseCalculo, faixa.ate);
    inss += (teto - anterior) * faixa.aliquota;
    anterior = faixa.ate;
  }
  return Math.round(inss * 100) / 100;
}

export function calcularIRRF(baseCalculo: number, numDependentes: number): number {
  const deducaoDep = numDependentes * DEDUCAO_DEPENDENTE_IRRF;
  const base = baseCalculo - deducaoDep;
  if (base <= 0) return 0;

  for (const faixa of FAIXAS_IRRF) {
    if (base <= faixa.ate) {
      const irrf = base * faixa.aliquota - faixa.deduzir;
      return Math.max(0, Math.round(irrf * 100) / 100);
    }
  }
  return 0;
}

export function calcularFolha(dados: DadosCalculo): ResultadoCalculo {
  const jornada = dados.jornadaMensal || 220;
  const valorHora = dados.salarioBase / jornada;

  // Proventos
  const horasExtras50 = Math.round(dados.horasExtras50Qtd * valorHora * 1.5 * 100) / 100;
  const horasExtras100 = Math.round(dados.horasExtras100Qtd * valorHora * 2 * 100) / 100;
  const faltasDesconto = Math.round(dados.faltasDias * (dados.salarioBase / 30) * 100) / 100;

  const remuneracaoTotal = dados.salarioBase + horasExtras50 + horasExtras100 + dados.outrosProventos - faltasDesconto;
  const totalProventos = dados.salarioBase + horasExtras50 + horasExtras100 + dados.outrosProventos;

  // INSS
  const inss = calcularINSS(remuneracaoTotal);

  // IRRF (base = remuneração - INSS)
  const baseIRRF = remuneracaoTotal - inss;
  const irrf = calcularIRRF(baseIRRF, dados.numDependentes);

  // VT desconto (6% do salário base)
  const vtDesconto = dados.descontoVT ? Math.round(dados.salarioBase * PERCENTUAL_VT_DESCONTO * 100) / 100 : 0;

  const totalDescontos = inss + irrf + vtDesconto + dados.descontoVR + dados.descontoPlanoSaude + faltasDesconto + dados.outrosDescontos;
  const salarioLiquido = Math.round((totalProventos - totalDescontos) * 100) / 100;

  // Encargos patronais
  const fgts = Math.round(remuneracaoTotal * ALIQUOTA_FGTS * 100) / 100;
  const inssPatronal = Math.round(remuneracaoTotal * ALIQUOTA_INSS_PATRONAL * 100) / 100;
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
