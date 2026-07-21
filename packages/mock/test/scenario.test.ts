import { describe, expect, it } from "vitest";
import { calcularSegregacao } from "@splitbr/client";
import { buildServer } from "../src/server.js";
import {
  calcularSimplificadoCentavos,
  PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER,
} from "../src/domain/calculo.js";
import { codigoRsup } from "../src/scenario/rsup-codes.js";
import { corpoIniciadaBoleto, headersValidos } from "./helpers.js";

// C12 do TEST_STRATEGY: RSUP correto por arranjo/tipo e valores calculados
// pelos dois procedimentos, com a funcao pura do client como referencia.

const TS = "2026-07-20T10:00:00-03:00";

async function prepararBoletoPaga(app: ReturnType<typeof buildServer>) {
  // vlInf 1000.00, vlCbsInf 9.00; pagamento parcial vlPago 617977 centavos
  // seria o caso C1 do client; aqui: vlPago 500.00 (parcial), segregou 4.00.
  await app.inject({
    method: "POST",
    url: "/api/v1/boleto",
    headers: headersValidos(),
    payload: corpoIniciadaBoleto(1),
  });
  await app.inject({
    method: "POST",
    url: "/api/v1/boleto/informe-preliminar-pagamento",
    headers: headersValidos(),
    payload: {
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
}

async function disparar(app: ReturnType<typeof buildServer>, cmd: Record<string, unknown>) {
  return app.inject({ method: "POST", url: "/_scenario/divergencia", payload: cmd });
}

describe("motor de cenarios RSUP (C12)", () => {
  it("cbs-correcao padrao no boleto: RSUP101 com vlCbsCorr da referencia do client", async () => {
    const app = buildServer();
    await prepararBoletoPaga(app);
    const res = await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00001",
      chave: "CTRL000001",
      tipo: "cbs-correcao",
      procedimento: "padrao",
    });
    expect(res.statusCode).toBe(201);
    const evento = res.json().publicado;
    expect(evento.codMsg).toBe("RSUP101");
    // Referencia: min((50000/100000)*900; 900) = 450 centavos = 4.50
    const esperado = calcularSegregacao({
      valorPagoCentavos: 50_000,
      valorOriginalCentavos: 100_000,
      informadoCentavos: 900,
    });
    expect(evento.vlCbsCorr).toBe(esperado / 100);
    expect(evento.vlCbsCorr).toBe(4.5);
  });

  it("evento respeita a matriz 3.6.1: boleto nunca carrega txId, ecoa idDda/numCtrlOrig", async () => {
    const app = buildServer();
    await prepararBoletoPaga(app);
    const res = await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00001",
      chave: "CTRL000001",
      tipo: "ibs-correcao",
      procedimento: "padrao",
    });
    const evento = res.json().publicado;
    expect(evento.codMsg).toBe("RSUP102");
    expect(evento.txId).toBeUndefined();
    expect(evento.idDda).toBe("DDA1");
    expect(evento.numCtrlOrig).toBe("CTRL000001");
  });

  it("cbs-em-aberto: diferenca entre devido e segregado (nunca negativa)", async () => {
    const app = buildServer();
    await prepararBoletoPaga(app);
    const res = await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00001",
      chave: "CTRL000001",
      tipo: "cbs-em-aberto",
      procedimento: "padrao",
    });
    const evento = res.json().publicado;
    expect(evento.codMsg).toBe("RSUP103");
    // devido 4.50 - segregado 4.00 = 0.50 em aberto
    expect(evento.vlCbsAberto).toBe(0.5);
  });

  it("procedimento simplificado usa o percentual configurado (placeholder default 0,9% CBS)", async () => {
    const app = buildServer();
    await prepararBoletoPaga(app);
    const res = await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00001",
      chave: "CTRL000001",
      tipo: "cbs-correcao",
      procedimento: "simplificado",
    });
    const evento = res.json().publicado;
    // 0,9% de 500.00 = 4.50
    expect(evento.vlCbsCorr).toBe(4.5);
    expect(calcularSimplificadoCentavos(500, PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER.cbsBps)).toBe(450);
  });

  it("simplificado trunca para baixo (nunca arredonda)", () => {
    // 0,9% de 123.45 = 1.11105 -> 1.11 (111 centavos)
    expect(calcularSimplificadoCentavos(123.45, 90)).toBe(111);
  });

  it("pix-dinamico e pix-automatico usam as faixas RSUP corretas", async () => {
    expect(codigoRsup("pix-dinamico", "ibs-correcao")).toBe("RSUP202");
    expect(codigoRsup("pix-automatico", "cbs-em-aberto")).toBe("RSUP603");
    expect(() => codigoRsup("ted", "cbs-correcao")).toThrow(/nao possui codigos RSUP/);
  });

  it("evento publicado chega pelo stream out com codMsg e nsuId", async () => {
    const app = buildServer({ streamTimeoutMs: 40 });
    await prepararBoletoPaga(app);
    await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00009",
      chave: "CTRL000001",
      tipo: "cbs-correcao",
      procedimento: "padrao",
    });
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/out/boleto/PSP00009/tributos/stream/start",
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(200);
    const tributos = res.json().tributos;
    expect(tributos).toHaveLength(1);
    expect(tributos[0].codMsg).toBe("RSUP101");
    expect(tributos[0].nsuId).toBe(1);
  });

  it("cenario sobre transacao inexistente responde 422", async () => {
    const app = buildServer();
    const res = await disparar(app, {
      arranjo: "boleto",
      idPsp: "PSP00001",
      chave: "NAO-EXISTE",
      tipo: "cbs-correcao",
      procedimento: "padrao",
    });
    expect(res.statusCode).toBe(422);
  });
});
