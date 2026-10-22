import type { Arranjo } from "../domain/matrices.js";

/**
 * Codigos do Retorno Super Inteligente (CodMsgEnum do contrato oficial):
 * RSUP101-104 boleto, RSUP201-204 Pix Dinamico, RSUP601-604 Pix Automatico.
 * O spec publica so o enum; a semantica por digito final esta no capitulo 6
 * do Manual de Integracao: 1 = CBS corrigido, 2 = CBS em aberto, 3 = IBS
 * corrigido, 4 = IBS em aberto.
 *
 * Ate a versao 0.2.0 este comentario dizia que o significado de cada digito
 * ainda nao tinha sido publicado, e o mapeamento seguia o brief do projeto,
 * com o 2 e o 3 trocados. A tabela oficial ja estava no manual v1.0,
 * vendorado desde julho de 2026; ninguem conferiu.
 */
export type TipoDivergencia =
  | "cbs-correcao"
  | "ibs-correcao"
  | "cbs-em-aberto"
  | "ibs-em-aberto";

const PREFIXO: Partial<Record<Arranjo, string>> = {
  boleto: "RSUP10",
  "pix-dinamico": "RSUP20",
  "pix-automatico": "RSUP60",
};

const DIGITO: Record<TipoDivergencia, string> = {
  "cbs-correcao": "1",
  "cbs-em-aberto": "2",
  "ibs-correcao": "3",
  "ibs-em-aberto": "4",
};

export function codigoRsup(arranjo: Arranjo, tipo: TipoDivergencia): string {
  const prefixo = PREFIXO[arranjo];
  if (!prefixo) {
    throw new Error(`Arranjo '${arranjo}' nao possui codigos RSUP no contrato (so boleto e Pix)`);
  }
  return `${prefixo}${DIGITO[tipo]}`;
}
