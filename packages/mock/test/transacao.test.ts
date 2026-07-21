import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { corpoIniciadaBoleto, headersValidos, itemBoletoIniciada } from "./helpers.js";

// C6 do TEST_STRATEGY: ciclo de vida da transacao + taxonomia 404/422.

const TS = "2026-07-20T10:00:00-03:00";

function itemAtualizadaBoleto(n: number): Record<string, unknown> {
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    vlInf: 1000.0,
    vlCbsInf: 9.5,
    vlIbsInf: 1.5,
    cnpjRaizPspRecDir: "12345678",
    dtHrAtu: TS,
    dtVenc: "2026-08-01",
    dtHrLimPgto: "2026-08-01T23:59:59-03:00",
  };
}

function itemBaixaBoleto(n: number): Record<string, unknown> {
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    numPgto: n,
    cnpjRaizPspRecDir: "12345678",
    dtHrBaixa: TS,
  };
}

function itemPreliminarBoleto(n: number): Record<string, unknown> {
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    numPgto: n,
    numIdentcBaixa: n,
    vlPago: 1000.0,
    vlCbsSegr: 9.0,
    vlIbsSegr: 1.0,
    indPgtoIntegral: "1",
    cnpjRaizPspRecDir: "12345678",
    cnpjRaizPspPag: "87654321",
    cnpjRec: "12345678000199",
    dtHrPgto: TS,
  };
}

function corpo(itens: Record<string, unknown>[]): Record<string, unknown> {
  return { infRequisicao: { dtHrMsg: TS }, transacoes: itens };
}

async function iniciar(app: ReturnType<typeof buildServer>, qtde = 1) {
  return app.inject({
    method: "POST",
    url: "/api/v1/boleto",
    headers: headersValidos(),
    payload: corpoIniciadaBoleto(qtde),
  });
}

describe("transacao iniciada (C6)", () => {
  it("201 com envelope PPResponseOk e store refletindo 'iniciada'", async () => {
    const app = buildServer({ seed: 7 });
    const res = await iniciar(app, 2);
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.numValidos).toBe(2);
    expect(body.numErros).toBe(0);
    expect(body.resourceId).toMatch(/^RES\d{13}$/);
    expect(app.store.obterTransacao("boleto", "CTRL000001")?.status).toBe("iniciada");
  });

  it("corpo fora do contrato oficial responde 400 (Ajv do spec)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/boleto",
      headers: headersValidos(),
      payload: { transacoes: [itemBoletoIniciada(1)] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });

  it("campo M ausente reprova no schema do contrato: 400 whole-body", async () => {
    const app = buildServer();
    const quebrado = itemBoletoIniciada(2);
    delete quebrado["idDda"];
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/boleto",
      headers: headersValidos(),
      payload: corpo([itemBoletoIniciada(1), quebrado]),
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });

  it("violacao de matriz que passa no schema vira errors[] com index (txId N/E no boleto)", async () => {
    const app = buildServer();
    const intruso = { ...itemBoletoIniciada(2), txId: "nao-devia-existir" };
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/boleto",
      headers: headersValidos(),
      payload: corpo([itemBoletoIniciada(1), intruso]),
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.numValidos).toBe(1);
    expect(body.numErros).toBe(1);
    expect(body.errors[0]).toMatchObject({ index: 1, field: "txId" });
    expect(app.store.obterTransacao("boleto", "CTRL000002")).toBeUndefined();
  });

  it("resourceIds sao deterministicos por seed (D-3)", async () => {
    const a = buildServer({ seed: 3 });
    const b = buildServer({ seed: 3 });
    const ra = (await iniciar(a)).json().resourceId;
    const rb = (await iniciar(b)).json().resourceId;
    expect(ra).toBe(rb);
  });
});

describe("transacao atualizada + baixa (C6)", () => {
  it("PATCH atualiza transacao conhecida", async () => {
    const app = buildServer();
    await iniciar(app);
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/boleto",
      headers: headersValidos(),
      payload: corpo([itemAtualizadaBoleto(1)]),
    });
    expect(res.statusCode).toBe(201);
    const t = app.store.obterTransacao("boleto", "CTRL000001");
    expect(t?.status).toBe("atualizada");
    expect(t?.dados["vlCbsInf"]).toBe(9.5);
  });

  it("PATCH com todas as transacoes desconhecidas responde 404 problem+json", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "PATCH",
      url: "/api/v1/boleto",
      headers: headersValidos(),
      payload: corpo([itemAtualizadaBoleto(99)]),
    });
    expect(res.statusCode).toBe(404);
    expect(res.json().title).toContain("nao encontrada");
  });

  it("baixa marca 'baixada'; baixa de transacao paga responde 422", async () => {
    const app = buildServer();
    await iniciar(app);
    const baixa1 = await app.inject({
      method: "POST",
      url: "/api/v1/boleto/baixa-exceto-pagamento",
      headers: headersValidos(),
      payload: corpo([itemBaixaBoleto(1)]),
    });
    expect(baixa1.statusCode).toBe(201);
    expect(app.store.obterTransacao("boleto", "CTRL000001")?.status).toBe("baixada");

    const app2 = buildServer();
    await iniciar(app2);
    await app2.inject({
      method: "POST",
      url: "/api/v1/boleto/informe-preliminar-pagamento",
      headers: headersValidos(),
      payload: corpo([itemPreliminarBoleto(1)]),
    });
    const baixaPaga = await app2.inject({
      method: "POST",
      url: "/api/v1/boleto/baixa-exceto-pagamento",
      headers: headersValidos(),
      payload: corpo([itemBaixaBoleto(1)]),
    });
    expect(baixaPaga.statusCode).toBe(422);
    expect(baixaPaga.json().detail).toContain("paga");
  });
});

describe("informe preliminar (C6)", () => {
  it("paga transacao conhecida e encerra a janela", async () => {
    const app = buildServer();
    await iniciar(app);
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/boleto/informe-preliminar-pagamento",
      headers: headersValidos(),
      payload: corpo([itemPreliminarBoleto(1)]),
    });
    expect(res.statusCode).toBe(201);
    expect(app.store.obterTransacao("boleto", "CTRL000001")?.status).toBe("paga");
  });

  it("preliminar apos baixa responde 422 (janela encerrada)", async () => {
    const app = buildServer();
    await iniciar(app);
    await app.inject({
      method: "POST",
      url: "/api/v1/boleto/baixa-exceto-pagamento",
      headers: headersValidos(),
      payload: corpo([itemBaixaBoleto(1)]),
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/boleto/informe-preliminar-pagamento",
      headers: headersValidos(),
      payload: corpo([itemPreliminarBoleto(1)]),
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().detail).toContain("janela");
  });

  it("TED registra direto como paga (sem fluxo de transacao previo no contrato)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ted/informe-preliminar-pagamento",
      headers: headersValidos(),
      payload: corpo([
        {
          index: 1,
          numCtrlTED: "TED0001",
          vlPago: 500.0,
          vlCbsSegr: 4.5,
          vlIbsSegr: 0.5,
          docFiscal: "NFe123",
          cnpjRaizPspRecDir: "12345678",
          cnpjRaizPspPag: "87654321",
          cnpjRec: "12345678000199",
          cnpjCpfPagEfet: "98765432000188",
          dtHrLiq: TS,
        },
      ]),
    });
    expect(res.statusCode).toBe(201);
    expect(app.store.obterTransacao("ted", "TED0001")?.status).toBe("paga");
  });

  it("campo N/E do arranjo e apontado no envelope (dtHrPgto no TED)", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/ted/informe-preliminar-pagamento",
      headers: headersValidos(),
      payload: corpo([
        {
          index: 1,
          numCtrlTED: "TED0002",
          vlPago: 500.0,
          vlCbsSegr: 4.5,
          vlIbsSegr: 0.5,
          docFiscal: "NFe123",
          cnpjRaizPspRecDir: "12345678",
          cnpjRaizPspPag: "87654321",
          cnpjRec: "12345678000199",
          cnpjCpfPagEfet: "98765432000188",
          dtHrLiq: TS,
          dtHrPgto: TS,
        },
      ]),
    });
    const body = res.json();
    const campos = (body.errors ?? []).map((e: { field: string }) => e.field);
    expect(campos).toContain("dtHrPgto");
  });
});
