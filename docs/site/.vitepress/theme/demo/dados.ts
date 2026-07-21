/**
 * Dados reais dos casos da demo, em centavos inteiros. Numeros e payloads foram
 * re-capturados de `npx @splitbr/mock@0.1.0` (seed 1) nesta sessao de launch e
 * batem byte a byte com docs/site/tutorial.md (boleto R$ 1.000,00). A demo
 * consome estes dados e os passa ao motor (engine.ts), que delega a matematica a
 * calcularSegregacao publicada; nenhum valor aqui e um resultado hardcoded, sao
 * ENTRADAS (o que o originador informa) das quais o resultado e computado.
 *
 * Honestidade (LC 214, art. 33): as aliquotas 0,9% (CBS) e 0,1% (IBS) sao a
 * ALIQUOTA DE TESTE de 2026 (fase de transicao), nao as definitivas. A UI rotula
 * isso na tela; a flag abaixo carrega o aviso para o modo tecnico.
 */
import type { CasoSegregacao } from "./engine.js";

export interface EntradaCaso {
  id: "ciclo-feliz" | "correcao-fisco" | "parcial";
  /** Entradas de segregacao consumidas pelo motor. */
  segregacao: CasoSegregacao;
  /** Aviso de honestidade a exibir com os numeros deste caso. */
  avisoAliquota: string;
}

const AVISO_TESTE_2026 =
  "Aliquotas de teste de 2026 (fase de transicao): CBS 0,9% e IBS 0,1%. As definitivas ainda nao valem. Veja /base-legal.";

/** Caso 1: venda comum, boleto de R$ 1.000,00 pago integralmente. */
export const cicloFeliz: EntradaCaso = {
  id: "ciclo-feliz",
  segregacao: {
    valorNotaCentavos: 100_000, // R$ 1.000,00
    valorPagoCentavos: 100_000, // pago integral
    cbsInformadoCentavos: 900, // R$ 9,00 (0,9%)
    ibsInformadoCentavos: 100, // R$ 1,00 (0,1%)
  },
  avisoAliquota: AVISO_TESTE_2026,
};

/**
 * Caso 2: o fisco confere e corrige. O originador informou CBS a menor (R$ 6,00)
 * e o valor correto era R$ 9,00; a correcao chega pelo retorno RSUP e o motor
 * recalcula com o corrigido (nao e um numero encenado).
 */
export const correcaoFisco: EntradaCaso = {
  id: "correcao-fisco",
  segregacao: {
    valorNotaCentavos: 100_000,
    valorPagoCentavos: 100_000,
    cbsInformadoCentavos: 600, // informado a menor: R$ 6,00
    ibsInformadoCentavos: 100,
    cbsCorrigidoCentavos: 900, // fisco corrige para R$ 9,00
  },
  avisoAliquota: AVISO_TESTE_2026,
};

/** Caso 3: pagamento parcial (R$ 500,00 de uma nota de R$ 1.000,00). */
export const parcial: EntradaCaso = {
  id: "parcial",
  segregacao: {
    valorNotaCentavos: 100_000,
    valorPagoCentavos: 50_000, // pagou metade
    cbsInformadoCentavos: 900,
    ibsInformadoCentavos: 100,
  },
  avisoAliquota: AVISO_TESTE_2026,
};

export const casos: readonly EntradaCaso[] = [cicloFeliz, correcaoFisco, parcial];

/**
 * Payloads reais do caso 1 para o modo tecnico (endpoint + resposta exatos do
 * mock publicado). Cases 2 e 3 ganham os seus em Slices 3/4. Provenance: tutorial
 * re-captura 2026-07-21.
 */
export const payloadsCicloFeliz = {
  emitir: {
    endpoint: "POST /api/v1/boleto",
    resposta: {
      title: "Sucesso",
      status: 201,
      numValidos: 1,
      numErros: 0,
      resourceId: "RES0000000001001",
    },
  },
  pagar: {
    endpoint: "POST /api/v1/boleto/informe-preliminar-pagamento",
    resposta: {
      title: "Sucesso",
      status: 201,
      resourceId: "RES0000000001002",
    },
  },
  retorno: {
    endpoint: "GET /api/v1/out/boleto/{psp}/tributos/stream/start",
    resposta: {
      tributos: [
        {
          codMsg: "RSUP101",
          vlCbsCorr: 9,
          numCtrlOrig: "CTRL000001",
          vlInf: 1000,
          nsuId: 1,
        },
      ],
    },
  },
} as const;
