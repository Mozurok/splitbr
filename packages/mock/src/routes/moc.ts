import type { FastifyInstance } from "fastify";
import { sendProblem } from "../plugins/problem.js";
import type { ContextoRotas } from "./transacao.js";
import { acharOperacao, responderEnvelope, validarEntrada } from "./util.js";

/**
 * Mecanismo de Ocorrências (MOC), seção 3.9 do Manual de Integração v1.1.0.
 *
 * Fluxo novo no v1.1.0, em três rotas: o PSP registra uma **solicitação** de
 * estorno ou uma **notificação**, e depois consulta as **ocorrências** que já
 * receberam resposta da RFB ou do CGIBS.
 *
 * As duas primeiras são discriminadas por presença de campo, não por rota: a
 * solicitação exige `codMotOcor`, `vlCbsEst` e `vlIbsEst` e proíbe os campos de
 * processo administrativo; a notificação proíbe os três de estorno. O Ajv já
 * enforca isso a partir do próprio spec (`allOf` com `required` e `not`), então
 * aqui não há regra duplicada: o mock valida contra o contrato, como nas
 * demais rotas.
 *
 * A resposta da RFB/CGIBS é simulada de forma determinística. Sem isso a
 * consulta devolveria 204 para sempre e a rota seria decoração: o valor de
 * simular está justamente em o integrador ver o ciclo fechar.
 */

/** Códigos do spec: 01 defere, 02 indefere, 03 defere parcialmente. */
const PARECERES = ["01", "02", "03"] as const;
const ORGAOS = ["RFB", "CGIBS"] as const;

export interface OcorrenciaRegistrada {
  nsuId: number;
  cnpjRaizPspRecDir: string;
  retorno: Record<string, unknown>;
}

function respostaSimulada(
  ocorrencia: Record<string, unknown>,
  nsuId: number,
  dtHrResposta: string,
): Record<string, unknown> {
  // Determinístico pelo NSU: o mesmo seed sempre produz o mesmo parecer, que é
  // o que deixa um teste de integração ser escrito contra o mock (D-3).
  const parecer = PARECERES[nsuId % PARECERES.length] as string;
  const orgao = ORGAOS[nsuId % ORGAOS.length] as string;
  const ehSolicitacao = ocorrencia["codMotOcor"] !== undefined;

  // A matriz 3.9.4.1 exige, por arranjo, o identificador da transação
  // correspondente; repassar o que veio preserva a amarração com a ocorrência
  // original em vez de inventar um id novo.
  const identificadores: Record<string, unknown> = {};
  for (const campo of ["idDda", "txId", "e2eId", "numCtrlTED", "numCtrlTEF", "numIdentcBaixa"]) {
    if (ocorrencia[campo] !== undefined) identificadores[campo] = ocorrencia[campo];
  }

  const retorno: Record<string, unknown> = {
    nsuId: String(nsuId),
    arrj: ocorrencia["arrj"],
    idOcor: ocorrencia["idOcor"],
    dtHrEnvOcor: ocorrencia["dtHrPgto"] ?? dtHrResposta,
    dtHrRespOcor: dtHrResposta,
    orgRespRes: orgao,
    codParecer: parecer,
    tpTrib: nsuId % 2 === 0 ? "CBS" : "IBS",
    vlTribEst: ehSolicitacao ? (ocorrencia["vlCbsEst"] ?? 0) : 0,
    ...identificadores,
  };

  // idAprovEst só existe quando houve deferimento: um estorno indeferido não
  // tem aprovação para identificar.
  if (ehSolicitacao && parecer !== "02") {
    retorno["idAprovEst"] = `APROV${String(nsuId).padStart(10, "0")}`;
  }
  retorno["descParecer"] =
    parecer === "01" ? "Deferido" : parecer === "02" ? "Indeferido" : "Deferido parcialmente";

  return retorno;
}

export function registrarRotasMoc(app: FastifyInstance, ctx: ContextoRotas): void {
  for (const tipo of ["solicitacao", "notificacao"] as const) {
    const rota = `/api/v1/moc/${tipo}`;
    app.post(rota, async (request, reply) => {
      const entrada = validarEntrada(request, reply, acharOperacao(ctx.registro, "post", rota));
      if (!entrada) return;

      const ocorrencias = (entrada.body["ocorrencias"] as Array<Record<string, unknown>>) ?? [];
      const inf = (entrada.body["infRequisicao"] as Record<string, unknown>) ?? {};
      const dtHrMsg = String(inf["dtHrMsg"] ?? "");

      for (const ocorrencia of ocorrencias) {
        const nsuId = ctx.store.moc.length + 1;
        ctx.store.moc.push({
          nsuId,
          // O cnpjRaizPspRecDir vem no item, não no envelope, nas ocorrências.
          cnpjRaizPspRecDir: String(ocorrencia["cnpjRaizPspRecDir"] ?? ""),
          retorno: respostaSimulada(ocorrencia, nsuId, dtHrMsg),
        });
      }

      return responderEnvelope(reply, ctx.store.proximoResourceId(), ocorrencias.length, []);
    });
  }

  app.get("/api/v1/moc/:cnpjRaizPspRecDir/ocorrencias", async (request, reply) => {
    const { cnpjRaizPspRecDir } = request.params as { cnpjRaizPspRecDir: string };
    const query = request.query as { nsuInicial?: string; limite?: string };

    const nsuInicial = Number(query.nsuInicial);
    if (!Number.isInteger(nsuInicial) || nsuInicial < 1) {
      return sendProblem(reply, {
        status: 400,
        title: "Parametro obrigatorio ausente ou invalido",
        detail: "nsuInicial e obrigatorio na consulta de ocorrencias e deve ser inteiro >= 1",
      });
    }
    // O spec limita a página a 1.000 itens; o default segue o teto.
    const limite = query.limite !== undefined ? Number(query.limite) : 1000;
    if (!Number.isInteger(limite) || limite < 1 || limite > 1000) {
      return sendProblem(reply, {
        status: 400,
        title: "Parametro invalido",
        detail: "limite, quando presente, deve ser inteiro entre 1 e 1000",
      });
    }

    const pagina = ctx.store.moc
      .filter((o) => o.cnpjRaizPspRecDir === cnpjRaizPspRecDir && o.nsuId >= nsuInicial)
      .slice(0, limite)
      .map((o) => o.retorno);

    // 204 é o vazio legítimo aqui: não há ocorrência com resposta a partir
    // daquele NSU, o que é diferente de erro.
    if (pagina.length === 0) return reply.status(204).send();
    return reply.status(200).send({ ocorrencias: pagina });
  });
}
