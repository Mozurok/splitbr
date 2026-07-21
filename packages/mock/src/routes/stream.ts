import type { FastifyInstance, FastifyReply } from "fastify";
import type { Arranjo } from "../domain/matrices.js";
import { sendProblem } from "../plugins/problem.js";
import type { ContextoRotas } from "./transacao.js";

const ARRANJOS_STREAM: Arranjo[] = ["boleto", "pix-automatico", "pix-dinamico"];

export interface OpcoesStream {
  /** Janela do long polling em ms (configuravel; o manual nao fixa valor). */
  timeoutMs: number;
}

/**
 * Fluxos 3.6/3.7 do Manual: Retorno Super Inteligente (out) e Consulta
 * Retroativa, ambos pull-based com token de posicao e long polling.
 * 200 entrega tributos em ordem de NSU com headers streamId/proximoToken;
 * 204 na janela vazia; DELETE encerra o stream (token some, 422 depois).
 */
export function registrarRotasStream(
  app: FastifyInstance,
  ctx: ContextoRotas,
  opcoes: OpcoesStream,
): void {
  // streamId so vai no header onde o contrato o declara: o 200 do
  // out .../stream/start (spec-parity, review-hard).
  const responderConsumo = async (
    reply: FastifyReply,
    token: string,
    incluirStreamId = false,
  ): Promise<FastifyReply> => {
    const saida = await ctx.store.eventos.consumir(token, opcoes.timeoutMs);
    if (saida.resultado === "desconhecido") {
      return sendProblem(reply, {
        status: 422,
        title: "Token de stream desconhecido",
        detail: `Token '${token}' nao corresponde a um stream ativo (encerrado, em uso concorrente ou nunca aberto)`,
      });
    }
    if (incluirStreamId) reply.header("streamId", saida.streamId);
    reply.header("proximoToken", saida.proximoToken);
    if (saida.resultado === "vazio") return reply.status(204).send();
    return reply.status(200).send({ tributos: saida.eventos });
  };

  for (const arranjo of ARRANJOS_STREAM) {
    const baseOut = `/api/v1/out/${arranjo}/:idPsp/tributos/stream`;
    const baseRetro = `/api/v1/retroativo/${arranjo}/:idPsp/tributos/stream`;

    app.get(`${baseOut}/start`, async (request, reply) => {
      const { idPsp } = request.params as { idPsp: string };
      const { token } = ctx.store.eventos.abrirStream(arranjo, idPsp);
      return responderConsumo(reply, token, true);
    });

    app.get(`${baseOut}/:token`, async (request, reply) => {
      return responderConsumo(reply, (request.params as { token: string }).token);
    });

    app.delete(`${baseOut}/:token`, async (request, reply) => {
      const { token } = request.params as { token: string };
      if (!ctx.store.eventos.encerrar(token)) {
        return sendProblem(reply, {
          status: 422,
          title: "Token de stream desconhecido",
          detail: `Token '${token}' nao corresponde a um stream ativo`,
        });
      }
      return reply.status(204).send();
    });

    app.get(`${baseRetro}/start`, async (request, reply) => {
      const { idPsp } = request.params as { idPsp: string };
      const query = request.query as { fromNsu?: string; toNsu?: string; streamId?: string };
      const fromNsu = Number(query.fromNsu);
      if (!Number.isInteger(fromNsu) || fromNsu < 1) {
        return sendProblem(reply, {
          status: 400,
          title: "Parametro obrigatorio ausente ou invalido",
          detail: "fromNsu e obrigatorio na consulta retroativa e deve ser inteiro >= 1",
        });
      }
      const toNsu = query.toNsu !== undefined ? Number(query.toNsu) : undefined;
      if (toNsu !== undefined && (!Number.isInteger(toNsu) || toNsu < 1)) {
        return sendProblem(reply, {
          status: 400,
          title: "Parametro invalido",
          detail: "toNsu, quando presente, deve ser inteiro >= 1",
        });
      }
      const aberto = ctx.store.eventos.abrirRetroativo(
        arranjo,
        idPsp,
        fromNsu,
        toNsu,
        query.streamId,
      );
      if (!aberto) {
        return sendProblem(reply, {
          status: 422,
          title: "streamId desconhecido",
          detail: `streamId '${query.streamId}' nao corresponde a um stream deste arranjo/PSP`,
        });
      }
      return responderConsumo(reply, aberto.token);
    });

    app.get(`${baseRetro}/:token`, async (request, reply) => {
      return responderConsumo(reply, (request.params as { token: string }).token);
    });

    app.delete(`${baseRetro}/:token`, async (request, reply) => {
      const { token } = request.params as { token: string };
      if (!ctx.store.eventos.encerrar(token)) {
        return sendProblem(reply, {
          status: 422,
          title: "Token de stream desconhecido",
          detail: `Token '${token}' nao corresponde a um stream ativo`,
        });
      }
      return reply.status(204).send();
    });
  }
}
