import type { FastifyInstance } from "fastify";
import {
  calcularPadraoCentavos,
  calcularSimplificadoCentavos,
  PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER,
} from "../domain/calculo.js";
import { carregarMatriz, type Arranjo } from "../domain/matrices.js";
import { sendProblem } from "../plugins/problem.js";
import type { MemoryStore } from "../store/memory.js";
import { codigoRsup, type TipoDivergencia } from "./rsup-codes.js";

export type Procedimento = "padrao" | "simplificado";

export interface ComandoDivergencia {
  arranjo: Arranjo;
  idPsp: string;
  /** Chave natural da transacao ja registrada no mock. */
  chave: string;
  tipo: TipoDivergencia;
  procedimento: Procedimento;
  /** Percentuais do simplificado em bps; default: placeholder rotulado (oficiais indefinidos). */
  percentuais?: { cbsBps: number; ibsBps: number };
}

function reais(centavos: number): number {
  return centavos / 100;
}

/**
 * Motor de cenarios: recalcula o tributo da transacao pelo procedimento
 * escolhido, monta o evento Super Inteligente com o RSUP correto e SOMENTE os
 * campos que a matriz 3.6.1 permite para o arranjo, e publica na fila.
 */
export function dispararDivergencia(store: MemoryStore, cmd: ComandoDivergencia) {
  const transacao = store.obterTransacao(cmd.arranjo, cmd.chave);
  if (!transacao) {
    throw new Error(`Transacao '${cmd.chave}' nao registrada para '${cmd.arranjo}'`);
  }
  const d = transacao.dados;
  const vlPago = Number(d["vlPago"] ?? d["vlInf"]);
  if (!Number.isFinite(vlPago)) {
    throw new Error(`Transacao '${cmd.chave}' sem vlPago/vlInf para o calculo`);
  }
  const tributo = cmd.tipo.startsWith("cbs") ? "cbs" : "ibs";
  const percentuais = cmd.percentuais ?? PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER;

  let esperadoCentavos: number;
  if (cmd.procedimento === "simplificado") {
    esperadoCentavos = calcularSimplificadoCentavos(
      vlPago,
      tributo === "cbs" ? percentuais.cbsBps : percentuais.ibsBps,
    );
  } else {
    const informado = Number(d[tributo === "cbs" ? "vlCbsInf" : "vlIbsInf"] ?? d[tributo === "cbs" ? "vlCbsSegr" : "vlIbsSegr"]);
    if (!Number.isFinite(informado)) {
      throw new Error(`Transacao '${cmd.chave}' sem tributo informado/segregado para o procedimento padrao`);
    }
    const vlInf = Number(d["vlInf"]);
    esperadoCentavos = calcularPadraoCentavos({
      vlPago,
      ...(Number.isFinite(vlInf) ? { vlInf } : {}),
      tributoInformado: informado,
    });
  }

  const segregadoCentavos = Math.round(
    Number(d[tributo === "cbs" ? "vlCbsSegr" : "vlIbsSegr"] ?? 0) * 100,
  );

  const evento: Record<string, unknown> = {
    codMsg: codigoRsup(cmd.arranjo, cmd.tipo),
  };
  if (cmd.tipo.endsWith("correcao")) {
    evento[tributo === "cbs" ? "vlCbsCorr" : "vlIbsCorr"] = reais(esperadoCentavos);
  } else {
    const aberto = Math.max(esperadoCentavos - segregadoCentavos, 0);
    evento[tributo === "cbs" ? "vlCbsAberto" : "vlIbsAberto"] = reais(aberto);
  }

  // Ecoa da transacao apenas os campos permitidos pela matriz do arranjo
  // (secao 3.6.1); campos N/E nunca entram no evento.
  const matriz = carregarMatriz("super-inteligente");
  const idx = matriz.arranjos.indexOf(cmd.arranjo);
  for (const [campo, regras] of Object.entries(matriz.transacoes)) {
    if (campo === "codMsg" || campo === "nsuId" || evento[campo] !== undefined) continue;
    if (regras[idx] === "NE") continue;
    const valor = d[campo];
    if (valor !== undefined) evento[campo] = valor;
  }

  return store.eventos.publicar(cmd.arranjo, cmd.idPsp, evento);
}

/** Rotas utilitarias de cenario (fora de /api, isentas dos headers). */
export function registrarRotasCenario(app: FastifyInstance, store: MemoryStore): void {
  app.post("/_scenario/divergencia", async (request, reply) => {
    try {
      const evento = dispararDivergencia(store, request.body as ComandoDivergencia);
      return reply.status(201).send({ publicado: evento });
    } catch (e) {
      return sendProblem(reply, {
        status: 422,
        title: "Cenario invalido",
        detail: (e as Error).message,
      });
    }
  });
}
