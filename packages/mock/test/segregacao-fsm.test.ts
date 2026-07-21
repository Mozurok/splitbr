import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { gerarIdInfSegr, gerarIdRepasse } from "../src/domain/ids.js";
import { headersValidos } from "./helpers.js";

// C7 (rejeicao integral do lote), C8 (cross-validacao da finalizacao),
// C9 (passos fora de ordem nao mutam estado) do TEST_STRATEGY.

const TS = "2026-07-20T10:00:00-03:00";

function itemLoteBoleto(n: number, cbs = 9.0, ibs = 1.0): Record<string, unknown> {
  return {
    index: n,
    idDda: `DDA${n}`,
    numCtrlOrig: `CTRL${String(n).padStart(6, "0")}`,
    numPgto: n,
    numIdentcBaixa: n,
    vlPago: 1000.0,
    vlCbsSegr: cbs,
    vlIbsSegr: ibs,
    indPgtoIntegral: "1",
    cnpjRaizPspPag: "87654321",
    cnpjRec: "12345678000199",
    dtHrPgto: TS,
    dtHrLiq: TS,
    dtHrRepasse: TS,
  };
}

const inf = { cnpjRaizPspRecDir: "12345678", dtHrMsg: TS };

async function iniciarRemessa(app: ReturnType<typeof buildServer>, idInfSegr: string) {
  return app.inject({
    method: "POST",
    url: "/api/v1/segregacao",
    headers: headersValidos(),
    payload: {
      infRequisicao: inf,
      dadosInfoSeg: { idRepasse: gerarIdRepasse("boleto", 1), arrj: "BOL", idInfSegr },
    },
  });
}

async function enviarLote(
  app: ReturnType<typeof buildServer>,
  idInfSegr: string,
  idLote: string,
  itens: Record<string, unknown>[],
) {
  return app.inject({
    method: "POST",
    url: `/api/v1/boleto/segregacao/${idInfSegr}/lotes`,
    headers: headersValidos(),
    payload: { infRequisicao: inf, dadosLoteSeg: { idLote }, transacoes: itens },
  });
}

async function finalizar(
  app: ReturnType<typeof buildServer>,
  idInfSegr: string,
  totalTrans: number,
  cbs: number,
  ibs: number,
) {
  return app.inject({
    method: "POST",
    url: "/api/v1/segregacao/finalizacao",
    headers: headersValidos(),
    payload: {
      infRequisicao: inf,
      dadosFinalSeg: { idInfSegr, totalTrans, valorTotalCbs: cbs, valorTotalIbs: ibs },
    },
  });
}

describe("fluxo feliz dos 3 passos", () => {
  it("remessa -> 2 lotes -> finalizacao com totais exatos", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 1);
    expect((await iniciarRemessa(app, id)).statusCode).toBe(201);
    expect((await enviarLote(app, id, "L1", [itemLoteBoleto(1), itemLoteBoleto(2)])).statusCode).toBe(201);
    expect((await enviarLote(app, id, "L2", [itemLoteBoleto(3)])).statusCode).toBe(201);
    const fim = await finalizar(app, id, 3, 27.0, 3.0);
    expect(fim.statusCode).toBe(201);
    expect(fim.json().totalTrans).toBe(3);
  });
});

describe("rejeicao integral do lote (C7)", () => {
  it("um item com campo N/E rejeita o lote inteiro e nada acumula", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 2);
    await iniciarRemessa(app, id);
    const intruso = { ...itemLoteBoleto(2), txId: "intruso-no-boleto" };
    const res = await enviarLote(app, id, "L1", [itemLoteBoleto(1), intruso]);
    expect(res.statusCode).toBe(422);
    expect(res.json().title).toContain("rejeitado integralmente");
    // Nada do lote (nem o item valido) entrou nos totais.
    expect(app.store.segregacao.obter(id)?.totalTrans).toBe(0);
    // Reenvio corrigido do lote fecha o fluxo (manual 3.5.2: corrigir e reenviar).
    expect((await enviarLote(app, id, "L1", [itemLoteBoleto(1), itemLoteBoleto(2)])).statusCode).toBe(201);
    expect((await finalizar(app, id, 2, 18.0, 2.0)).statusCode).toBe(201);
  });

  it("mesmo idLote com payload DIFERENTE e conflito 422", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 3);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    const conflito = await enviarLote(app, id, "L1", [itemLoteBoleto(2)]);
    expect(conflito.statusCode).toBe(422);
    expect(conflito.json().title).toContain("Conflito");
  });

  it("replay byte-identico do lote e 200 Recebido Anteriormente com o MESMO resourceId", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 30);
    await iniciarRemessa(app, id);
    const r1 = await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    expect(r1.statusCode).toBe(201);
    const r2 = await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    expect(r2.statusCode).toBe(200);
    expect(r2.json().title).toContain("Recebido Anteriormente");
    expect(r2.json().resourceId).toBe(r1.json().resourceId);
    // replay nao re-acumula
    expect(app.store.segregacao.obter(id)?.totalTrans).toBe(1);
  });
});

describe("cross-validacao da finalizacao (C8)", () => {
  it("1 centavo de divergencia falha a finalizacao", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 4);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    const res = await finalizar(app, id, 1, 9.01, 1.0);
    expect(res.statusCode).toBe(422);
    expect(res.json().title).toContain("divergente");
    const ok = await finalizar(app, id, 1, 9.0, 1.0);
    expect(ok.statusCode).toBe(201);
  });

  it("totalTrans divergente falha", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 5);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1), itemLoteBoleto(2)]);
    const res = await finalizar(app, id, 3, 18.0, 2.0);
    expect(res.statusCode).toBe(422);
  });

  it("soma em centavos nao sofre contaminacao de float (0.1+0.2)", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 6);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1, 0.1, 0.1), itemLoteBoleto(2, 0.2, 0.2)]);
    const ok = await finalizar(app, id, 2, 0.3, 0.3);
    expect(ok.statusCode).toBe(201);
  });
});

describe("passos fora de ordem (C9)", () => {
  it("lote sem remessa iniciada: 422 (idInfSegr nao encontrado)", async () => {
    const app = buildServer();
    const res = await enviarLote(app, gerarIdInfSegr("boleto", 7), "L1", [itemLoteBoleto(1)]);
    expect(res.statusCode).toBe(422);
    expect(res.json().title).toContain("nao encontrado");
  });

  it("finalizacao replay identico: 200 Recebido Anteriormente sem mutar estado", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 8);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    const r1 = await finalizar(app, id, 1, 9.0, 1.0);
    expect(r1.statusCode).toBe(201);
    const replay = await finalizar(app, id, 1, 9.0, 1.0);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().title).toContain("Recebido Anteriormente");
    expect(replay.json().resourceId).toBe(r1.json().resourceId);
    expect(app.store.segregacao.obter(id)?.estado).toBe("finalizada");
  });

  it("finalizacao conflitante apos finalizada: 422", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 28);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    await finalizar(app, id, 1, 9.0, 1.0);
    const conflito = await finalizar(app, id, 1, 9.99, 1.0);
    expect(conflito.statusCode).toBe(422);
    expect(conflito.json().title).toContain("Conflito");
  });

  it("lote apos finalizacao: 422 e totais intactos", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 9);
    await iniciarRemessa(app, id);
    await enviarLote(app, id, "L1", [itemLoteBoleto(1)]);
    await finalizar(app, id, 1, 9.0, 1.0);
    const tardio = await enviarLote(app, id, "L2", [itemLoteBoleto(2)]);
    expect(tardio.statusCode).toBe(422);
    expect(app.store.segregacao.obter(id)?.totalTrans).toBe(1);
  });

  it("remessa replay identico: 200 Recebido Anteriormente; conflito: 422", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 10);
    const r1 = await iniciarRemessa(app, id);
    expect(r1.statusCode).toBe(201);
    const replay = await iniciarRemessa(app, id);
    expect(replay.statusCode).toBe(200);
    expect(replay.json().title).toContain("Recebido Anteriormente");
    expect(replay.json().resourceId).toBe(r1.json().resourceId);
    const conflito = await app.inject({
      method: "POST",
      url: "/api/v1/segregacao",
      headers: headersValidos(),
      payload: {
        infRequisicao: inf,
        dadosInfoSeg: { idRepasse: gerarIdRepasse("boleto", 2), arrj: "BOL", idInfSegr: id },
      },
    });
    expect(conflito.statusCode).toBe(422);
    expect(conflito.json().title).toContain("Conflito");
  });

  it("arranjo divergente entre remessa e lote: 422", async () => {
    const app = buildServer();
    const id = gerarIdInfSegr("boleto", 11);
    await iniciarRemessa(app, id);
    const res = await app.inject({
      method: "POST",
      url: `/api/v1/ted/segregacao/${id}/lotes`,
      headers: headersValidos(),
      payload: {
        infRequisicao: inf,
        dadosLoteSeg: { idLote: "L1" },
        transacoes: [
          {
            index: 1,
            numCtrlTED: "TED1",
            vlPago: 100.0,
            vlCbsSegr: 0.9,
            vlIbsSegr: 0.1,
            docFiscal: "NFe1",
            cnpjRaizPspPag: "87654321",
            cnpjRec: "12345678000199",
            cnpjCpfPagEfet: "98765432000188",
            dtHrLiq: TS,
            dtHrRepasse: TS,
          },
        ],
      },
    });
    expect(res.statusCode).toBe(422);
    expect(res.json().title).toContain("divergente");
  });
});
