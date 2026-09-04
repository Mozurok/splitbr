// Mecanismo de Ocorrências (3.9), fluxo novo no contrato v1.1.0.
//
// O que estes testes protegem, além do caminho feliz: a discriminação entre
// solicitação e notificação é por PRESENÇA de campo, não por rota. As duas
// aceitam o mesmo tipo de ocorrência, e o que separa uma da outra é
// `codMotOcor`/`vlCbsEst`/`vlIbsEst` estarem presentes ou proibidos. Essa
// regra vem do próprio spec (allOf com required e not) e é o Ajv que a aplica,
// então um teste que só exercitasse o caminho feliz não notaria se ela caísse.
import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { headersValidos } from "./helpers.js";

const TS = "2026-07-20T10:00:00-03:00";
const PSP = "12345678";

function ocorrenciaBase(n: number): Record<string, unknown> {
  return {
    index: n,
    idOcor: `SOL12345678BOL20260623000000${n}`,
    arrj: "BOL",
    vlPago: 10.02,
    vlCbsSegr: 5.01,
    vlIbsSegr: 5.01,
    dtHrPgto: TS,
    dtHrLiq: TS,
    cnpjRaizPspPag: "87654321",
    cnpjRaizPspRecDir: PSP,
    cnpjRec: "11444777000142",
    cnpjPagOrig: "11444777000142",
    cnpjCpfDest: "11444777000142",
    idDda: `123A51231231231${n}FAS1`,
  };
}

function solicitacao(n = 1): Record<string, unknown> {
  return {
    infRequisicao: { dtHrMsg: TS },
    ocorrencias: [{ ...ocorrenciaBase(n), codMotOcor: "02", vlCbsEst: 5.01, vlIbsEst: 5.01 }],
  };
}

function notificacao(n = 1): Record<string, unknown> {
  return { infRequisicao: { dtHrMsg: TS }, ocorrencias: [ocorrenciaBase(n)] };
}

describe("MOC: registro de ocorrências (3.9.2, 3.9.3)", () => {
  it("aceita uma solicitação de estorno", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/moc/solicitacao",
      headers: headersValidos(),
      payload: solicitacao(),
    });
    expect(res.statusCode).toBe(201);
    expect(res.json().resourceId).toMatch(/^RES/);
  });

  it("aceita uma notificação", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/moc/notificacao",
      headers: headersValidos(),
      payload: notificacao(),
    });
    expect(res.statusCode).toBe(201);
  });

  it("recusa solicitação sem os valores de estorno, que ela exige", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/moc/solicitacao",
      headers: headersValidos(),
      payload: notificacao(), // sem codMotOcor/vlCbsEst/vlIbsEst
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });

  it("recusa notificação que traz valores de estorno, que ela proíbe", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/moc/notificacao",
      headers: headersValidos(),
      payload: solicitacao(), // com os campos que a notificação proíbe
    });
    expect(res.statusCode).toBe(400);
  });
});

describe("MOC: consulta de ocorrências (3.9.4)", () => {
  async function comUmaSolicitacao() {
    const app = buildServer();
    await app.inject({
      method: "POST",
      url: "/api/v1/moc/solicitacao",
      headers: headersValidos(),
      payload: solicitacao(),
    });
    return app;
  }

  it("devolve a ocorrência com a resposta da RFB/CGIBS", async () => {
    const app = await comUmaSolicitacao();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=1`,
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(200);
    const [primeira] = res.json().ocorrencias;
    expect(primeira.nsuId).toBe("1");
    expect(["RFB", "CGIBS"]).toContain(primeira.orgRespRes);
    expect(["01", "02", "03"]).toContain(primeira.codParecer);
    expect(["CBS", "IBS"]).toContain(primeira.tpTrib);
    // Amarração com a ocorrência original: o identificador da transação volta.
    expect(primeira.idDda).toBe("123A512312312311FAS1");
  });

  it("204 quando não há ocorrência a partir daquele NSU", async () => {
    const app = await comUmaSolicitacao();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=99`,
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(204);
  });

  it("204 para outro PSP: ocorrência de um não vaza para o outro", async () => {
    const app = await comUmaSolicitacao();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/moc/99999999/ocorrencias?nsuInicial=1",
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(204);
  });

  it("nsuInicial é obrigatório", async () => {
    const app = await comUmaSolicitacao();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias`,
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(400);
    expect(res.json().detail).toContain("nsuInicial");
  });

  it("limite fora de 1..1000 é recusado, porque o spec limita a página", async () => {
    const app = await comUmaSolicitacao();
    for (const limite of [0, 1001]) {
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=1&limite=${limite}`,
        headers: headersValidos(),
      });
      expect(res.statusCode).toBe(400);
    }
  });

  it("limite corta a página e o NSU avança", async () => {
    const app = buildServer();
    for (const n of [1, 2, 3]) {
      await app.inject({
        method: "POST",
        url: "/api/v1/moc/solicitacao",
        headers: headersValidos(),
        payload: solicitacao(n),
      });
    }
    const pagina1 = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=1&limite=2`,
      headers: headersValidos(),
    });
    expect(pagina1.json().ocorrencias.map((o: { nsuId: string }) => o.nsuId)).toEqual(["1", "2"]);

    const pagina2 = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=3`,
      headers: headersValidos(),
    });
    expect(pagina2.json().ocorrencias.map((o: { nsuId: string }) => o.nsuId)).toEqual(["3"]);
  });

  it("a resposta é determinística: mesma entrada, mesmo parecer", async () => {
    const parecer = async () => {
      const app = await comUmaSolicitacao();
      const res = await app.inject({
        method: "GET",
        url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=1`,
        headers: headersValidos(),
      });
      return res.json().ocorrencias[0].codParecer;
    };
    expect(await parecer()).toBe(await parecer());
  });

  it("idAprovEst só aparece quando o estorno não foi indeferido", async () => {
    const app = await comUmaSolicitacao();
    const res = await app.inject({
      method: "GET",
      url: `/api/v1/moc/${PSP}/ocorrencias?nsuInicial=1`,
      headers: headersValidos(),
    });
    const [o] = res.json().ocorrencias;
    if (o.codParecer === "02") expect(o.idAprovEst).toBeUndefined();
    else expect(o.idAprovEst).toMatch(/^APROV\d{10}$/);
  });
});
