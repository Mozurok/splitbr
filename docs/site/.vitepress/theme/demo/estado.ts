/**
 * Ponte entre os inputs do modo livre (unidades do usuario: R$, %) e a entrada
 * do motor (centavos inteiros). A conversao usa aritmetica inteira; o motor
 * (engine.ts) e quem faz a segregacao pela calcularSegregacao publicada (D-1).
 */
import type { CasoSegregacao } from "./engine.js";

export interface EntradaLivre {
  /** Valor da nota em reais (o usuario digita/arrasta). */
  valorNotaReais: number;
  /** Aliquota CBS informada, em % (default 0,9% = teste 2026). */
  cbsPct: number;
  /** Aliquota IBS informada, em % (default 0,1% = teste 2026). */
  ibsPct: number;
  /** Fracao paga, 0..1 (1 = integral). */
  fracaoPaga: number;
}

/** Converte a entrada do modo livre para o caso que o motor consome. */
export function livreParaCaso(e: EntradaLivre): CasoSegregacao {
  const valorNotaCentavos = Math.max(0, Math.round(e.valorNotaReais * 100));
  const fracao = Math.min(1, Math.max(0, e.fracaoPaga));
  return {
    valorNotaCentavos: Math.max(1, valorNotaCentavos), // o motor exige Vt > 0
    valorPagoCentavos: Math.round(valorNotaCentavos * fracao),
    cbsInformadoCentavos: Math.round((valorNotaCentavos * e.cbsPct) / 100),
    ibsInformadoCentavos: Math.round((valorNotaCentavos * e.ibsPct) / 100),
  };
}
