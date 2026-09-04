import type { FastifyInstance, FastifyReply } from "fastify";
import { gerarTimestampSplit } from "@splitbr/client";
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
 * 200 entrega transacoes em ordem de NSU com headers streamId/proximoToken;
 * 204 na janela vazia; DELETE encerra o stream (token some, 422 depois).
 *
 * Renomes do v1.1.0 nesta area: o parametro de rota {idPsp} virou
 * {cnpjRaizPspRecDir} (8 posicoes, raiz do CNPJ, nao mais o identificador
 * opaco do PSP), o segmento /tributos/ virou /transacoes/, e a chave do corpo
 * de resposta acompanhou: `tributos` virou `transacoes`.
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
    // Duas adaptacoes ao v1.1.0 na fronteira HTTP, e so aqui: internamente o
    // nsuId segue sendo numero, porque e o cursor de ordenacao da fila, mas o
    // contrato passou a declara-lo string (^\d{1,19}$). E dtHrDisp entrou como
    // obrigatorio: e o instante em que a plataforma disponibilizou a mensagem
    // para consumo, que so existe no momento da entrega.
    const dtHrDisp = gerarTimestampSplit();
    const transacoes = saida.eventos.map((e) => ({
      ...e,
      nsuId: String(e.nsuId),
      dtHrDisp,
    }));
    return reply.status(200).send({ transacoes });
  };

  for (const arranjo of ARRANJOS_STREAM) {
    const baseOut = `/api/v1/out/${arranjo}/:cnpjRaizPspRecDir/transacoes/stream`;
    const baseRetro = `/api/v1/retroativo/${arranjo}/:cnpjRaizPspRecDir/transacoes/stream`;

    app.get(`${baseOut}/start`, async (request, reply) => {
      const { cnpjRaizPspRecDir } = request.params as { cnpjRaizPspRecDir: string };
      const { token } = ctx.store.eventos.abrirStream(arranjo, cnpjRaizPspRecDir);
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
      const { cnpjRaizPspRecDir } = request.params as { cnpjRaizPspRecDir: string };
      // v1.1.0 renomeou os dois: fromNsu/toNsu viraram nsuInicial/nsuFinal.
      const query = request.query as { nsuInicial?: string; nsuFinal?: string; streamId?: string };
      const nsuInicial = Number(query.nsuInicial);
      if (!Number.isInteger(nsuInicial) || nsuInicial < 1) {
        return sendProblem(reply, {
          status: 400,
          title: "Parametro obrigatorio ausente ou invalido",
          detail: "nsuInicial e obrigatorio na consulta retroativa e deve ser inteiro >= 1",
        });
      }
      const nsuFinal = query.nsuFinal !== undefined ? Number(query.nsuFinal) : undefined;
      if (nsuFinal !== undefined && (!Number.isInteger(nsuFinal) || nsuFinal < 1)) {
        return sendProblem(reply, {
          status: 400,
          title: "Parametro invalido",
          detail: "nsuFinal, quando presente, deve ser inteiro >= 1",
        });
      }
      const aberto = ctx.store.eventos.abrirRetroativo(
        arranjo,
        cnpjRaizPspRecDir,
        nsuInicial,
        nsuFinal,
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
