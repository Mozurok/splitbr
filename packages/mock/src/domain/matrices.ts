import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import type { ProblemInput } from "../plugins/problem.js";

/**
 * Matrizes M/O/N-E do Manual de Integracao v1.0 (secoes 3.1-3.6) como DADOS
 * (regra de design do brief: as matrizes sao o produto). Nenhum branch por
 * arranjo em codigo: a regra vem sempre do JSON.
 */
export type Regra = "M" | "O" | "NE";

export type Arranjo =
  | "boleto"
  | "pix-automatico"
  | "pix-dinamico"
  | "pix-estatico"
  | "ted"
  | "tef";

export interface Matriz {
  informe: string;
  fonte: string;
  arranjos: Arranjo[];
  topo: Record<string, Regra[]>;
  transacoes: Record<string, Regra[]>;
}

export interface ErroMatriz {
  campo: string;
  /** Indice do item em transacoes[], ausente para campo de topo. */
  indice?: number;
  motivo: "mandatorio-ausente" | "nao-existe-para-arranjo";
}

// Mesmo racional do loader do spec: src/domain/ em dev (dois niveis), dist/
// no pacote buildado (um nivel); resolve o candidato existente.
const DATA_DIR =
  ["../../data/matrices/", "../data/matrices/"]
    .map((rel) => fileURLToPath(new URL(rel, import.meta.url)))
    .find((p) => existsSync(p)) ?? "data/matrices/";
const cache = new Map<string, Matriz>();

export function carregarMatriz(informe: string): Matriz {
  const cached = cache.get(informe);
  if (cached) return cached;
  const matriz = JSON.parse(
    readFileSync(`${DATA_DIR}${informe}.json`, "utf8"),
  ) as Matriz;
  cache.set(informe, matriz);
  return matriz;
}

function regraDe(matriz: Matriz, secao: "topo" | "transacoes", campo: string, arranjo: Arranjo): Regra | undefined {
  const idx = matriz.arranjos.indexOf(arranjo);
  if (idx === -1) return undefined;
  return matriz[secao][campo]?.[idx];
}

const ENVELOPES_TOPO = ["infRequisicao", "dadosInfoSeg", "dadosFinalSeg", "dadosLoteSeg"];

function resolverCampo(objeto: Record<string, unknown>, campo: string): unknown {
  // No contrato oficial os campos de topo vem aninhados em envelopes
  // (infRequisicao em InfoRequestSemCnpj; dadosInfoSeg/dadosFinalSeg/
  // dadosLoteSeg na segregacao); a matriz do manual lista o campo plano,
  // entao a resolucao aceita o plano e os envelopes conhecidos.
  if (objeto[campo] !== undefined) return objeto[campo];
  for (const env of ENVELOPES_TOPO) {
    const dentro = objeto[env];
    if (dentro && typeof dentro === "object") {
      const valor = (dentro as Record<string, unknown>)[campo];
      if (valor !== undefined) return valor;
    }
  }
  return undefined;
}

function validarSecao(
  matriz: Matriz,
  secao: "topo" | "transacoes",
  arranjo: Arranjo,
  objeto: Record<string, unknown>,
  indice?: number,
): ErroMatriz[] {
  const erros: ErroMatriz[] = [];
  for (const campo of Object.keys(matriz[secao])) {
    const regra = regraDe(matriz, secao, campo, arranjo);
    const valor = secao === "topo" ? resolverCampo(objeto, campo) : objeto[campo];
    const presente = valor !== undefined && valor !== null;
    if (regra === "M" && !presente) {
      erros.push({ campo, motivo: "mandatorio-ausente", ...(indice !== undefined ? { indice } : {}) });
    } else if (regra === "NE" && presente) {
      erros.push({ campo, motivo: "nao-existe-para-arranjo", ...(indice !== undefined ? { indice } : {}) });
    }
  }
  return erros;
}

/**
 * Valida um payload de informe contra a matriz do arranjo. Campos de topo e
 * cada item de `transacoes[]` (quando a matriz tem secao de transacoes).
 */
export function validarContraMatriz(
  matriz: Matriz,
  arranjo: Arranjo,
  payload: Record<string, unknown>,
): ErroMatriz[] {
  if (!matriz.arranjos.includes(arranjo)) {
    throw new Error(`Arranjo '${arranjo}' fora da matriz '${matriz.informe}'`);
  }
  const erros = validarSecao(matriz, "topo", arranjo, payload);
  if (Object.keys(matriz.transacoes).length > 0) {
    const lista = payload["transacoes"];
    if (Array.isArray(lista)) {
      lista.forEach((item, i) => {
        erros.push(
          ...validarSecao(matriz, "transacoes", arranjo, item as Record<string, unknown>, i),
        );
      });
    }
  }
  return erros;
}

/** Converte erros de matriz no problem+json 400 da taxonomia do manual. */
export function errosParaProblem(
  matriz: Matriz,
  arranjo: Arranjo,
  erros: ErroMatriz[],
): ProblemInput {
  const primeiro = erros[0]!;
  const onde = primeiro.indice !== undefined ? ` (transacoes[${primeiro.indice}])` : "";
  return {
    status: 400,
    title: "Payload em desacordo com a matriz de campos do arranjo",
    detail:
      `Campo '${primeiro.campo}'${onde} ${primeiro.motivo === "mandatorio-ausente" ? "e mandatorio" : "nao existe"} ` +
      `para o arranjo '${arranjo}' no informe '${matriz.informe}' (${matriz.fonte})`,
    extensions: { arranjo, informe: matriz.informe, erros },
  };
}
