import type { FastifyReply, FastifyRequest } from "fastify";
import type { OperacaoCompilada, RegistroSpec } from "../spec/load.js";
import { sendProblem } from "../plugins/problem.js";
import {
  errosParaProblem,
  validarContraMatriz,
  type Arranjo,
  type ErroMatriz,
  type Matriz,
} from "../domain/matrices.js";

export interface ErroItem {
  index: number;
  field: string;
  message: string;
}

/** Envelope de sucesso PPResponseOk do contrato oficial (201). */
export function responderEnvelope(
  reply: FastifyReply,
  resourceId: string,
  numValidos: number,
  erros: ErroItem[],
): FastifyReply {
  return reply.status(201).send({
    title: "Sucesso",
    status: 201,
    detail: "Solicitacao processada com sucesso",
    numValidos,
    numErros: erros.length,
    errors: erros,
    resourceId,
  });
}

export function acharOperacao(
  registro: RegistroSpec,
  method: string,
  path: string,
): OperacaoCompilada | undefined {
  return registro.operacoes.find((o) => o.method === method && o.path === path);
}

/**
 * Validacao de entrada compartilhada: schema Ajv do contrato (D-2) e depois a
 * matriz do arranjo. Erros de topo respondem 400; erros por item viram
 * errors[] do envelope 201 (shape PPResponseOk). Retorna null quando a
 * resposta ja foi enviada.
 */
export function validarEntrada(
  request: FastifyRequest,
  reply: FastifyReply,
  op: OperacaoCompilada | undefined,
  matriz: Matriz,
  arranjo: Arranjo,
): { body: Record<string, unknown>; errosItem: ErroMatriz[] } | null {
  const body = (request.body ?? {}) as Record<string, unknown>;

  if (op?.validarBody && !op.validarBody(body)) {
    const primeiro = op.validarBody.errors?.[0];
    sendProblem(reply, {
      status: 400,
      title: "Corpo em desacordo com o contrato oficial",
      detail: `${primeiro?.instancePath ?? ""} ${primeiro?.message ?? "schema invalido"}`.trim(),
      extensions: { erros: op.validarBody.errors ?? [] },
    });
    return null;
  }

  const erros = validarContraMatriz(matriz, arranjo, body);
  const errosTopo = erros.filter((e) => e.indice === undefined);
  if (errosTopo.length > 0) {
    sendProblem(reply, errosParaProblem(matriz, arranjo, errosTopo));
    return null;
  }
  return { body, errosItem: erros.filter((e) => e.indice !== undefined) };
}

export function matrizErroParaItem(e: ErroMatriz): ErroItem {
  return {
    index: e.indice ?? -1,
    field: e.campo,
    message:
      e.motivo === "mandatorio-ausente"
        ? "campo mandatorio ausente para o arranjo"
        : "campo nao existe para o arranjo",
  };
}
