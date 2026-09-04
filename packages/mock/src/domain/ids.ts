import type { Arranjo } from "./matrices.js";

/**
 * Regexes-chave do Manual de Integracao v1.1.0: idRepasse (30 posicoes),
 * idInfSegr (34 posicoes), idLote (40 posicoes), CNPJ alfanumerico
 * (IN RFB 2.229/2024).
 */
export const ID_REPASSE = /^[A-Za-z0-9]{16}(PXA|PXD|PXE|BOL|TED|TEF)\d{11}$/;
export const ID_INF_SEGR = /^[A-Za-z0-9]{16}(PXA|PXD|PXE|BOL|TED|TEF)\d{15}$/;
/**
 * v1.1.0: o idLote deixou de ser livre (era 1 a 16 posicoes, sem formato) e
 * passou a ser derivado, `idInfSegr` seguido de um sequencial de 6 digitos.
 * Isso amarra o lote ao informe no proprio identificador, entao um lote nao
 * pode mais ser enviado para o informe errado sem que o formato denuncie.
 */
export const ID_LOTE = /^[A-Za-z0-9]{34}\d{6}$/;
export const CNPJ_ALFANUMERICO = /^[A-Za-z0-9]{14}$/;
export const CNPJ_RAIZ = /^[A-Za-z0-9]{8}$/;

export const CODIGO_ARRANJO: Record<Arranjo, string> = {
  boleto: "BOL",
  "pix-automatico": "PXA",
  "pix-dinamico": "PXD",
  "pix-estatico": "PXE",
  ted: "TED",
  tef: "TEF",
};

function prefixoDeterministico(n: number): string {
  // 16 posicoes alfanumericas deterministicas a partir do contador (D-3).
  return `SPLITBRMOCK${String(n % 100_000).padStart(5, "0")}`;
}

export function gerarIdRepasse(arranjo: Arranjo, n: number): string {
  return `${prefixoDeterministico(n)}${CODIGO_ARRANJO[arranjo]}${String(n).padStart(11, "0")}`;
}

export function gerarIdInfSegr(arranjo: Arranjo, n: number): string {
  return `${prefixoDeterministico(n)}${CODIGO_ARRANJO[arranjo]}${String(n).padStart(15, "0")}`;
}

/** idLote do v1.1.0: idInfSegr (34) mais o sequencial do lote (6 digitos). */
export function gerarIdLote(idInfSegr: string, sequencial: number): string {
  return `${idInfSegr}${String(sequencial).padStart(6, "0")}`;
}
