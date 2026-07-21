import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { headersValidos } from "./helpers.js";

// C10 do TEST_STRATEGY: long polling com token de posicao, 204 na janela
// vazia, ordem por NSU, retomada por cursor e teardown via DELETE.

function evento(n: number): Record<string, unknown> {
  return { codMsg: `RSUP10${n}`, idDda: `DDA${n}`, numCtrlOrig: `C${n}`, vlInf: 100.0 };
}

function servidor() {
  // Janela curta para testes: o timeout do long polling e configuravel
  // (fontes nao fixam valor; ver Open questions do plano).
  return buildServer({ streamTimeoutMs: 40 });
}

async function poll(app: ReturnType<typeof buildServer>, url: string) {
  return app.inject({ method: "GET", url, headers: headersValidos() });
}

describe("stream out (Super Inteligente, 3.6)", () => {
  it("janela vazia: 204 com proximoToken e streamId nos headers", async () => {
    const app = servidor();
    const res = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    expect(res.statusCode).toBe(204);
    expect(res.headers["proximotoken"]).toMatch(/^S/);
    expect(res.headers["streamid"]).toMatch(/^STREAM-/);
  });

  it("entrega em ordem de NSU e avanca o cursor pelo token", async () => {
    const app = servidor();
    app.store.eventos.publicar("boleto", "PSP00001", evento(1));
    app.store.eventos.publicar("boleto", "PSP00001", evento(2));
    const r1 = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    expect(r1.statusCode).toBe(200);
    const corpo1 = r1.json();
    expect(corpo1.tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([1, 2]);
    const token1 = r1.headers["proximotoken"] as string;

    app.store.eventos.publicar("boleto", "PSP00001", evento(3));
    const r2 = await poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token1}`);
    expect(r2.statusCode).toBe(200);
    expect(r2.json().tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([3]);
  });

  it("evento publicado DURANTE a janela resolve antes do timeout", async () => {
    const app = buildServer({ streamTimeoutMs: 2000 });
    const pendente = poll(app, "/api/v1/out/pix-dinamico/PSP00002/tributos/stream/start");
    const inicio = Date.now();
    setTimeout(() => {
      app.store.eventos.publicar("pix-dinamico", "PSP00002", { codMsg: "RSUP201", txId: "t1", vlInf: 5.0 });
    }, 30);
    const res = await pendente;
    expect(res.statusCode).toBe(200);
    expect(Date.now() - inicio).toBeLessThan(1500);
  });

  it("token antigo e invalidado apos o consumo (rotacao)", async () => {
    const app = servidor();
    app.store.eventos.publicar("boleto", "PSP00001", evento(1));
    const r1 = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    const token1 = r1.headers["proximotoken"] as string;
    await poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token1}`);
    const reuso = await poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token1}`);
    expect(reuso.statusCode).toBe(422);
  });

  it("DELETE encerra o stream; poll seguinte responde 422", async () => {
    const app = servidor();
    const r1 = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    const token = r1.headers["proximotoken"] as string;
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`,
      headers: headersValidos(),
    });
    expect(del.statusCode).toBe(204);
    const depois = await poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`);
    expect(depois.statusCode).toBe(422);
  });

  it("streams por arranjo/idPsp sao independentes", async () => {
    const app = servidor();
    app.store.eventos.publicar("boleto", "PSPA0001", evento(1));
    const outro = await poll(app, "/api/v1/out/boleto/PSPB0002/tributos/stream/start");
    expect(outro.statusCode).toBe(204);
  });
});

describe("modos retroativo com ledger de entregas (3.7, review-hard M3)", () => {
  async function entregarTudo(app: ReturnType<typeof buildServer>, qtde: number) {
    // publica e CONSOME via out-stream para alimentar o ledger de entregas
    for (let i = 1; i <= qtde; i++) app.store.eventos.publicar("boleto", "PSP00001", evento(i));
    const r = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    return { streamId: r.headers["streamid"] as string, res: r };
  }

  it("modo 2 (fromNsu+toNsu+streamId): so o que AQUELE stream entregou", async () => {
    const app = servidor();
    const { streamId } = await entregarTudo(app, 3);
    const res = await poll(
      app,
      `/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1&toNsu=2&streamId=${streamId}`,
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([1, 2]);
  });

  it("modo 3 (stream encerrada): limitado ao entregue, nunca tail vivo", async () => {
    const app = servidor();
    const { streamId, res } = await entregarTudo(app, 2);
    const token = res.headers["proximotoken"] as string;
    await app.inject({
      method: "DELETE",
      url: `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`,
      headers: headersValidos(),
    });
    // eventos publicados DEPOIS do encerramento nao entram na consulta
    app.store.eventos.publicar("boleto", "PSP00001", evento(3));
    const retro = await poll(
      app,
      `/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1&streamId=${streamId}`,
    );
    expect(retro.statusCode).toBe(200);
    expect(retro.json().tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([1, 2]);
  });

  it("streamId desconhecido: 422", async () => {
    const app = servidor();
    const res = await poll(
      app,
      "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1&streamId=STREAM-999",
    );
    expect(res.statusCode).toBe(422);
  });

  it("sem streamId o teto e snapshot do entregue (nao inclui nao-entregues)", async () => {
    const app = servidor();
    await entregarTudo(app, 2);
    // 3o evento publicado mas NUNCA entregue por stream nenhum
    app.store.eventos.publicar("boleto", "PSP00001", evento(3));
    const res = await poll(
      app,
      "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1",
    );
    expect(res.statusCode).toBe(200);
    expect(res.json().tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([1, 2]);
  });

  it("toNsu nao numerico: 400", async () => {
    const app = servidor();
    const res = await poll(
      app,
      "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1&toNsu=abc",
    );
    expect(res.statusCode).toBe(400);
  });

  it("reuso concorrente do mesmo token: exatamente um poll vence (claim atomico)", async () => {
    const app = servidor();
    app.store.eventos.publicar("boleto", "PSP00001", evento(1));
    const r1 = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    const token = r1.headers["proximotoken"] as string;
    app.store.eventos.publicar("boleto", "PSP00001", evento(2));
    const [a, b] = await Promise.all([
      poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`),
      poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`),
    ]);
    const codes = [a.statusCode, b.statusCode].sort();
    expect(codes).toEqual([200, 422]);
  });

  it("DELETE durante poll em voo mata o stream (poll nao rotaciona)", async () => {
    const app = buildServer({ streamTimeoutMs: 400 });
    const r1 = await app.inject({
      method: "GET",
      url: "/api/v1/out/boleto/PSP00001/tributos/stream/start",
      headers: headersValidos(),
    });
    const token = r1.headers["proximotoken"] as string;
    const emVoo = poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`);
    await new Promise((r) => setTimeout(r, 50));
    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`,
      headers: headersValidos(),
    });
    expect(del.statusCode).toBe(204);
    const res = await emVoo;
    expect(res.statusCode).toBe(422);
  });

  it("streamId so vai no header do start do out-stream (spec)", async () => {
    const app = servidor();
    app.store.eventos.publicar("boleto", "PSP00001", evento(1));
    const r1 = await poll(app, "/api/v1/out/boleto/PSP00001/tributos/stream/start");
    expect(r1.headers["streamid"]).toBeDefined();
    const token = r1.headers["proximotoken"] as string;
    app.store.eventos.publicar("boleto", "PSP00001", evento(2));
    const r2 = await poll(app, `/api/v1/out/boleto/PSP00001/tributos/stream/${token}`);
    expect(r2.headers["streamid"]).toBeUndefined();
    const retro = await poll(app, "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=1");
    expect(retro.headers["streamid"]).toBeUndefined();
  });
});

describe("consulta retroativa (3.7)", () => {
  it("intervalo fromNsu/toNsu entrega o recorte e depois 204 com token final", async () => {
    const app = servidor();
    for (let i = 1; i <= 4; i++) app.store.eventos.publicar("boleto", "PSP00001", evento(i));
    const r1 = await poll(
      app,
      "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start?fromNsu=2&toNsu=3",
    );
    expect(r1.statusCode).toBe(200);
    expect(r1.json().tributos.map((t: { nsuId: number }) => t.nsuId)).toEqual([2, 3]);
    const token = r1.headers["proximotoken"] as string;
    expect(token).toMatch(/^R/);

    const r2 = await poll(app, `/api/v1/retroativo/boleto/PSP00001/tributos/stream/${token}`);
    expect(r2.statusCode).toBe(204);
    const tokenFinal = r2.headers["proximotoken"] as string;

    const del = await app.inject({
      method: "DELETE",
      url: `/api/v1/retroativo/boleto/PSP00001/tributos/stream/${tokenFinal}`,
      headers: headersValidos(),
    });
    expect(del.statusCode).toBe(204);
  });

  it("fromNsu ausente responde 400 (parametro obrigatorio do contrato)", async () => {
    const app = servidor();
    const res = await poll(app, "/api/v1/retroativo/boleto/PSP00001/tributos/stream/start");
    expect(res.statusCode).toBe(400);
    expect(res.json().detail).toContain("fromNsu");
  });

  it("retroativo nao espera a janela: 204 imediato sem eventos no recorte", async () => {
    const app = buildServer({ streamTimeoutMs: 5000 });
    const inicio = Date.now();
    const res = await poll(
      app,
      "/api/v1/retroativo/pix-dinamico/PSP00001/tributos/stream/start?fromNsu=1",
    );
    expect(res.statusCode).toBe(204);
    expect(Date.now() - inicio).toBeLessThan(1000);
  });
});
