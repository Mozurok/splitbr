import { createHash } from "node:crypto";
import type { FastifyInstance, FastifyReply } from "fastify";
import { carregarMatriz, type Arranjo } from "../domain/matrices.js";
import { ErroSegregacao } from "../domain/segregacao-fsm.js";
import { sendProblem } from "../plugins/problem.js";
import type { ContextoRotas } from "./transacao.js";
import { acharOperacao, matrizErroParaItem, validarEntrada } from "./util.js";

const ARRANJOS: Arranjo[] = ["boleto", "pix-automatico", "pix-dinamico", "pix-estatico", "ted", "tef"];

function hashPayload(body: unknown): string {
  return createHash("sha256").update(JSON.stringify(body)).digest("hex");
}

function responderErroSegregacao(reply: FastifyReply, e: ErroSegregacao): FastifyReply {
  return sendProblem(reply, {
    status: e.status,
    title: e.titulo,
    detail: e.message,
    extensions: e.extensoes,
  });
}

/** Fluxo 3.5 do Manual: os 3 passos do Informe de Segregacao. */
export function registrarRotasSegregacao(app: FastifyInstance, ctx: ContextoRotas): void {
  app.post("/api/v1/segregacao", async (request, reply) => {
    const matriz = carregarMatriz("segregacao-remessa");
    const body = request.body as Record<string, unknown>;
    const dados = (body?.["dadosInfoSeg"] ?? {}) as Record<string, unknown>;
    const arrj = dados["arrj"];
    const arranjo = typeof arrj === "string" ? codigoParaArranjo(arrj) : undefined;
    const entrada = validarEntrada(
      request,
      reply,
      acharOperacao(ctx.registro, "post", "/api/v1/segregacao"),
      matriz,
      arranjo ?? "boleto",
    );
    if (!entrada) return;
    try {
      const { remessa, replay } = ctx.store.segregacao.iniciarRemessa(
        {
          idRepasse: String(dados["idRepasse"] ?? ""),
          arrj: String(arrj ?? ""),
          idInfSegr: String(dados["idInfSegr"] ?? ""),
        },
        hashPayload(body),
      );
      if (replay) {
        // Spec: replay byte-identico e sucesso 200 "Recebido Anteriormente".
        return reply.status(200).send({
          title: "PP Recebido Anteriormente",
          status: 200,
          detail: "Informe de segregação recebido anteriormente",
          resourceId: remessa.resourceIdRemessa,
          idInfSegr: remessa.idInfSegr,
        });
      }
      remessa.resourceIdRemessa = ctx.store.proximoResourceId();
      return reply.status(201).send({
        title: "PP Recebido",
        status: 201,
        detail: "Informe de segregação iniciado com sucesso",
        resourceId: remessa.resourceIdRemessa,
        idInfSegr: remessa.idInfSegr,
      });
    } catch (e) {
      if (e instanceof ErroSegregacao) return responderErroSegregacao(reply, e);
      throw e;
    }
  });

  for (const arranjo of ARRANJOS) {
    app.post(`/api/v1/${arranjo}/segregacao/:idInfSegr/lotes`, async (request, reply) => {
      const matriz = carregarMatriz("segregacao-lote");
      // idInfSegr chega como path param neste endpoint; a matriz do manual o
      // lista como campo do informe, entao entra no objeto antes da validacao.
      const bodyLote = request.body as Record<string, unknown> | null;
      if (bodyLote && typeof bodyLote === "object" && bodyLote["idInfSegr"] === undefined) {
        bodyLote["idInfSegr"] = (request.params as { idInfSegr: string }).idInfSegr;
      }
      const entrada = validarEntrada(
        request,
        reply,
        acharOperacao(ctx.registro, "post", `/api/v1/${arranjo}/segregacao/{idInfSegr}/lotes`),
        matriz,
        arranjo,
      );
      if (!entrada) return;
      const idInfSegr = (request.params as { idInfSegr: string }).idInfSegr;
      const dadosLote = (entrada.body["dadosLoteSeg"] ?? {}) as Record<string, unknown>;
      const transacoes =
        (entrada.body["transacoes"] as Array<Record<string, unknown>> | undefined) ?? [];
      try {
        const idLote = String(dadosLote["idLote"] ?? "");
        const { remessa, replay } = ctx.store.segregacao.receberLote(
          arranjo,
          idInfSegr,
          idLote,
          transacoes,
          entrada.errosItem.map(matrizErroParaItem),
          hashPayload(entrada.body),
        );
        if (replay) {
          return reply.status(200).send({
            title: "PP Recebido Anteriormente",
            status: 200,
            detail: "Lote recebido anteriormente",
            resourceId: remessa.resourceIdsLote.get(idLote),
          });
        }
        const resourceId = ctx.store.proximoResourceId();
        remessa.resourceIdsLote.set(idLote, resourceId);
        return reply.status(201).send({
          title: "PP Recebido",
          status: 201,
          detail: "Lote recebido com sucesso",
          resourceId,
        });
      } catch (e) {
        if (e instanceof ErroSegregacao) return responderErroSegregacao(reply, e);
        throw e;
      }
    });
  }

  app.post("/api/v1/segregacao/finalizacao", async (request, reply) => {
    const matriz = carregarMatriz("segregacao-finalizacao");
    const body = request.body as Record<string, unknown>;
    const dados = (body?.["dadosFinalSeg"] ?? {}) as Record<string, unknown>;
    const idInfSegr = String(dados["idInfSegr"] ?? "");
    const remessaExistente = ctx.store.segregacao.obter(idInfSegr);
    const entrada = validarEntrada(
      request,
      reply,
      acharOperacao(ctx.registro, "post", "/api/v1/segregacao/finalizacao"),
      matriz,
      remessaExistente?.arranjo ?? "boleto",
    );
    if (!entrada) return;
    try {
      const { remessa, replay } = ctx.store.segregacao.finalizar(
        {
          idInfSegr,
          totalTrans: Number(dados["totalTrans"]),
          valorTotalCbs: Number(dados["valorTotalCbs"]),
          valorTotalIbs: Number(dados["valorTotalIbs"]),
        },
        hashPayload(body),
      );
      if (replay) {
        return reply.status(200).send({
          title: "PP Recebido Anteriormente",
          status: 200,
          detail: "Informe de segregação recebido anteriormente",
          resourceId: remessa.resourceIdFinalizacao,
          idInfSegr: remessa.idInfSegr,
          totalTrans: remessa.totalTrans,
        });
      }
      remessa.resourceIdFinalizacao = ctx.store.proximoResourceId();
      return reply.status(201).send({
        title: "PP Recebido",
        status: 201,
        detail: "Informe de segregação finalizado com sucesso",
        resourceId: remessa.resourceIdFinalizacao,
        idInfSegr: remessa.idInfSegr,
        totalTrans: remessa.totalTrans,
      });
    } catch (e) {
      if (e instanceof ErroSegregacao) return responderErroSegregacao(reply, e);
      throw e;
    }
  });
}

function codigoParaArranjo(codigo: string): Arranjo | undefined {
  const mapa: Record<string, Arranjo> = {
    BOL: "boleto",
    PXA: "pix-automatico",
    PXD: "pix-dinamico",
    PXE: "pix-estatico",
    TED: "ted",
    TEF: "tef",
  };
  return mapa[codigo];
}
