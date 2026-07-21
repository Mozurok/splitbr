import type { Arranjo } from "../domain/matrices.js";

/**
 * Codigos do Retorno Super Inteligente (CodMsgEnum do contrato oficial):
 * RSUP101-104 boleto, RSUP201-204 Pix Dinamico, RSUP601-604 Pix Automatico.
 * O spec v0.0.10 publica apenas o enum; a semantica por digito final
 * (1 = CBS correcao, 2 = IBS correcao, 3 = CBS em aberto, 4 = IBS em aberto)
 * segue o brief e fica marcada como interpretacao do mock ate o Manual de
 * Operacoes detalhar codigo a codigo.
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
  "ibs-correcao": "2",
  "cbs-em-aberto": "3",
  "ibs-em-aberto": "4",
};

export function codigoRsup(arranjo: Arranjo, tipo: TipoDivergencia): string {
  const prefixo = PREFIXO[arranjo];
  if (!prefixo) {
    throw new Error(`Arranjo '${arranjo}' nao possui codigos RSUP no contrato (so boleto e Pix)`);
  }
  return `${prefixo}${DIGITO[tipo]}`;
}
