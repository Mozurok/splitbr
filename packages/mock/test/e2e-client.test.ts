import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createSplitClient,
  gerarCorrelationId,
  gerarTimestampSplit,
  toProblem,
} from "@splitbr/client";
import { buildServer, type MockServer } from "../src/server.js";

// R2 do TEST_STRATEGY: o @splitbr/client, SEM nenhuma modificacao, completa
// transacao -> segregacao -> consumo de stream contra o mock via HTTP real.

const TS = "2026-07-20T10:00:00-03:00";
let app: MockServer;
let baseUrl: string;

beforeAll(async () => {
  app = buildServer({ seed: 42, streamTimeoutMs: 40, resourceIdConsulta: true });
  baseUrl = await app.listen({ port: 0, host: "127.0.0.1" });
});

afterAll(async () => {
  await app.close();
});

function client() {
  return createSplitClient({ baseUrl, tenantId: "12345678000199" });
}

// Os tipos gerados marcam os header params como obrigatorios mesmo com o
// middleware os injetando (achado de DX registrado na task); valores validos
// aqui satisfazem o tipo e o middleware sobrescreve em onRequest.
function hdr() {
  return {
    messageId: crypto.randomUUID(),
    correlationId: gerarCorrelationId(),
    tenantId: "12345678000199",
    timestamp: gerarTimestampSplit(),
  };
}

describe("E2E: client dirige o mock de ponta a ponta (R2)", () => {
  it("ciclo completo: transacao -> preliminar -> segregacao 3 passos -> divergencia -> stream", async () => {
    const c = client();

    const iniciada = await c.POST("/api/v1/boleto", {
      params: { header: hdr() },
      body: {
        infRequisicao: { dtHrMsg: TS },
        transacoes: [
          {
            index: 1,
            idDda: "DDA1",
            numCtrlOrig: "CTRL000001",
            numCodBarras: "83660001",
            vlInf: 1000.0,
            vlCbsInf: 9.0,
            vlIbsInf: 1.0,
            cnpjRaizPspRecDir: "12345678",
            cnpjRec: "12345678000199",
            cnpjCpfPagOrig: "98765432000188",
            dtHrIni: TS,
            dtVenc: "2026-08-01",
            dtHrLimPgto: "2026-08-01T23:59:59-03:00",
          },
        ],
      },
    });
    expect(iniciada.response.status).toBe(201);
    expect(iniciada.data?.resourceId).toBeDefined();

    const preliminar = await c.POST("/api/v1/boleto/informe-preliminar-pagamento", {
      params: { header: hdr() },
      body: {
        infRequisicao: { dtHrMsg: TS },
        transacoes: [
          {
            index: 1,
            idDda: "DDA1",
            numCtrlOrig: "CTRL000001",
            numPgto: 1,
            numIdentcBaixa: 1,
            vlPago: 500.0,
            vlCbsSegr: 4.0,
            vlIbsSegr: 0.4,
            indPgtoIntegral: "0",
            cnpjRaizPspRecDir: "12345678",
            cnpjRaizPspPag: "87654321",
            cnpjRec: "12345678000199",
            dtHrPgto: TS,
          },
        ],
      },
    });
    expect(preliminar.response.status).toBe(201);

    const idInfSegr = "SPLITBRMOCK00001BOL000000000000001";
    const remessa = await c.POST("/api/v1/segregacao", {
      params: { header: hdr() },
      body: {
        infRequisicao: { cnpjRaizPspRecDir: "12345678", dtHrMsg: TS },
        dadosInfoSeg: {
          idRepasse: "SPLITBRMOCK00001BOL00000000001",
          arrj: "BOL",
          idInfSegr,
        },
      },
    });
    expect(remessa.response.status).toBe(201);

    const lote = await c.POST("/api/v1/boleto/segregacao/{idInfSegr}/lotes", {
      params: { path: { idInfSegr }, header: hdr() },
      body: {
        infRequisicao: { cnpjRaizPspRecDir: "12345678", dtHrMsg: TS },
        dadosLoteSeg: { idLote: "L1" },
        transacoes: [
          {
            index: 1,
            idDda: "DDA1",
            numCtrlOrig: "CTRL000001",
            numPgto: 1,
            numIdentcBaixa: 1,
            vlPago: 500.0,
            vlCbsSegr: 4.0,
            vlIbsSegr: 0.4,
            indPgtoIntegral: "0",
            cnpjRaizPspPag: "87654321",
            cnpjRec: "12345678000199",
            dtHrPgto: TS,
            dtHrLiq: TS,
            dtHrRepasse: TS,
          },
        ],
      },
    });
    expect(lote.response.status).toBe(201);

    const fim = await c.POST("/api/v1/segregacao/finalizacao", {
      params: { header: hdr() },
      body: {
        infRequisicao: { cnpjRaizPspRecDir: "12345678", dtHrMsg: TS },
        dadosFinalSeg: {
          idInfSegr,
          totalTrans: 1,
          valorTotalCbs: 4.0,
          valorTotalIbs: 0.4,
        },
      },
    });
    expect(fim.response.status).toBe(201);

    // Divergencia injetada chega no stream que o client consome.
    await fetch(`${baseUrl}/_scenario/divergencia`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        arranjo: "boleto",
        idPsp: "PSP00042",
        chave: "CTRL000001",
        tipo: "cbs-correcao",
        procedimento: "padrao",
      }),
    });
    const stream = await c.GET("/api/v1/out/boleto/{idPsp}/tributos/stream/start", {
      params: { path: { idPsp: "PSP00042" }, header: hdr() },
    });
    expect(stream.response.status).toBe(200);
    const tributos = (stream.data as { tributos: Array<Record<string, unknown>> }).tributos;
    expect(tributos[0]?.["codMsg"]).toBe("RSUP101");
    // padrao: min((500/1000)*9.00; 9.00) = 4.50
    expect(tributos[0]?.["vlCbsCorr"]).toBe(4.5);
    expect(stream.response.headers.get("proximoToken")).toMatch(/^S/);
  });

  it("caminho de caos: 429 vira ProblemDetail tipado com retryAfterSeconds", async () => {
    await fetch(`${baseUrl}/_chaos`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ rate429: { retryAfterSeconds: 30 } }),
    });
    const c = client();
    const res = await c.GET("/api/v1/out/boleto/{idPsp}/tributos/stream/start", {
      params: { path: { idPsp: "PSP00042" }, header: hdr() },
    });
    expect(res.response.status).toBe(429);
    const problem = toProblem(res.error, res.response);
    expect(problem.status).toBe(429);
    expect(problem.retryAfterSeconds).toBe(30);
    await fetch(`${baseUrl}/_chaos`, { method: "DELETE" });
  });

  it("stub da consulta por ResourceId (flag ligada) responde 501 explicando o gap", async () => {
    const c = client();
    const res = await (c as unknown as {
      GET: (p: string) => Promise<{ response: Response; error?: unknown }>;
    }).GET("/api/v1/consulta/resource/RES0000000042001");
    expect(res.response.status).toBe(501);
  });
});
