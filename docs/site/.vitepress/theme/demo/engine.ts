/**
 * Motor da demo interativa: computa o split de um caso USANDO a funcao publicada
 * calcularSegregacao do @splitbr/client (pacote interno deste monorepo). Nenhuma
 * matematica de imposto e reimplementada aqui (D-1): o numero que a demo mostra e
 * o numero do codigo que foi ao npm, o que torna a demo tambem uma validacao.
 *
 * A orquestracao dos passos (narrativa, animacao) vive na UI; este modulo so faz
 * o dinheiro. Tudo em centavos inteiros; nenhuma operacao de ponto flutuante toca
 * o valor (calcularSegregacao usa BigInt; formatarBRL usa aritmetica inteira).
 */
import { calcularSegregacao } from "@splitbr/client";

/** Entrada de um caso de simulacao, em centavos inteiros. */
export interface CasoSegregacao {
  /** Vt: valor original da nota, em centavos. */
  valorNotaCentavos: number;
  /** Vp: valor efetivamente pago, em centavos (< valorNota => pagamento parcial). */
  valorPagoCentavos: number;
  /** CBS informada pelo originador, em centavos. */
  cbsInformadoCentavos: number;
  /** IBS informado pelo originador, em centavos. */
  ibsInformadoCentavos: number;
  /** CBS corrigida pelo fisco (substitui a informada quando presente), em centavos. */
  cbsCorrigidoCentavos?: number | null;
  /** IBS corrigido pelo fisco (substitui o informado quando presente), em centavos. */
  ibsCorrigidoCentavos?: number | null;
}

/** Resultado do split, em centavos inteiros. */
export interface ResultadoSplit {
  cbsCentavos: number;
  ibsCentavos: number;
  /** CBS + IBS segregados: o que foi direto ao fisco. */
  foiParaFiscoCentavos: number;
  /** Do valor pago, o que sobrou para a empresa (pago - segregado). */
  sobrouParaEmpresaCentavos: number;
}

/**
 * Computa o split de um caso delegando cada tributo a calcularSegregacao. CBS e
 * IBS sao segregados de forma independente (sem compensacao cruzada), como no
 * contrato oficial.
 */
export function calcularSplit(caso: CasoSegregacao): ResultadoSplit {
  const base = {
    valorPagoCentavos: caso.valorPagoCentavos,
    valorOriginalCentavos: caso.valorNotaCentavos,
  };
  const cbsCentavos = calcularSegregacao({
    ...base,
    informadoCentavos: caso.cbsInformadoCentavos,
    corrigidoCentavos: caso.cbsCorrigidoCentavos,
  });
  const ibsCentavos = calcularSegregacao({
    ...base,
    informadoCentavos: caso.ibsInformadoCentavos,
    corrigidoCentavos: caso.ibsCorrigidoCentavos,
  });
  const foiParaFiscoCentavos = cbsCentavos + ibsCentavos;
  return {
    cbsCentavos,
    ibsCentavos,
    foiParaFiscoCentavos,
    sobrouParaEmpresaCentavos: caso.valorPagoCentavos - foiParaFiscoCentavos,
  };
}

/** Formata centavos inteiros em BRL (pt-BR) sem tocar em ponto flutuante. */
export function formatarBRL(centavos: number): string {
  const negativo = centavos < 0;
  const abs = Math.abs(centavos);
  const reais = Math.floor(abs / 100).toLocaleString("pt-BR");
  const cent = String(abs % 100).padStart(2, "0");
  return `${negativo ? "-" : ""}R$ ${reais},${cent}`;
}
