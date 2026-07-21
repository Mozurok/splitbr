import { calcularSegregacao } from "@splitbr/client";
import { paraCentavos } from "./segregacao-fsm.js";

/**
 * Os DOIS procedimentos de calculo do Decreto (art. 28), modelados desde o
 * dia um (regra do brief). A referencia da segregacao proporcional e a funcao
 * pura do @splitbr/client (constraint do plano: importar, nunca reimplementar).
 */

export interface EntradaPadrao {
  /** Valor pago na operacao, em reais decimais como no contrato. */
  vlPago: number;
  /** Valor original da transacao (vlInf); ausente = pagamento integral. */
  vlInf?: number;
  /** Tributo informado (vlCbsInf ou vlIbsInf) em reais. */
  tributoInformado: number;
  /** Teto em aberto em reais, quando conhecido. */
  emAberto?: number;
}

/** Procedimento padrao: proporcional por operacao, truncado para baixo. */
export function calcularPadraoCentavos(entrada: EntradaPadrao): number {
  return calcularSegregacao({
    valorPagoCentavos: Number(paraCentavos(entrada.vlPago)),
    valorOriginalCentavos: Number(paraCentavos(entrada.vlInf ?? entrada.vlPago)),
    informadoCentavos: Number(paraCentavos(entrada.tributoInformado)),
    ...(entrada.emAberto !== undefined
      ? { emAbertoCentavos: Number(paraCentavos(entrada.emAberto)) }
      : {}),
  });
}

/**
 * Procedimento simplificado: percentual preestabelecido sobre o valor pago
 * (Decreto art. 28), truncado para baixo. Percentual em pontos-base sobre
 * 10000 (aliquota-teste 2026: CBS 90 = 0,9%; IBS 10 = 0,1%).
 */
export function calcularSimplificadoCentavos(vlPago: number, percentualBps: number): number {
  if (!Number.isInteger(percentualBps) || percentualBps < 0) {
    throw new Error(`percentualBps deve ser inteiro >= 0; recebeu ${percentualBps}`);
  }
  return Number((paraCentavos(vlPago) * BigInt(percentualBps)) / 10_000n);
}

/**
 * Aliquotas de TESTE 2026 dos tributos em si (ADCT art. 125; LC 214 arts.
 * 343/346): CBS 0,9% + IBS 0,1%. NAO sao os percentuais do simplificado.
 */
export const ALIQUOTA_TESTE_2026 = { cbsBps: 90, ibsBps: 10 } as const;

/**
 * Placeholder ROTULADO do procedimento simplificado. Os percentuais oficiais
 * (LC 214 art. 33: preestabelecidos por setor economico ou contribuinte, via
 * atos RFB/CGIBS) NAO existem em jul/2026; a propria API beta do governo
 * declara as aliquotas dela como ficticias. Configure por chamada; este
 * default so espelha a aliquota-teste por falta de valor oficial.
 */
export const PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER = { cbsBps: 90, ibsBps: 10 } as const;
