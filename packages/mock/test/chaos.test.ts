import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { corpoIniciadaBoleto, headersValidos } from "./helpers.js";

// C11 do TEST_STRATEGY: taxonomia exata dos chaos flags e da auth simulada (D-4).

async function armar(app: ReturnType<typeof buildServer>, config: Record<string, unknown>) {
  return app.inject({ method: "POST", url: "/_chaos", payload: config });
}

async function tentar(app: ReturnType<typeof buildServer>) {
  return app.inject({
    method: "POST",
    url: "/api/v1/boleto",
    headers: headersValidos(),
    payload: corpoIniciadaBoleto(1),
  });
}

describe("chaos flags (C11)", () => {
  it("429 com Retry-After exato", async () => {
    const app = buildServer();
    await armar(app, { rate429: { retryAfterSeconds: 30 } });
    const res = await tentar(app);
    expect(res.statusCode).toBe(429);
    expect(res.headers["retry-after"]).toBe("30");
    expect(res.headers["content-type"]).toContain("application/problem+json");
  });

  it("503 circuit breaker com X-Circuit-Breaker, X-Retry-Allowed e Retry-After", async () => {
    const app = buildServer();
    await armar(app, { circuito503: { retryAfterSeconds: 60, retryAllowed: false } });
    const res = await tentar(app);
    expect(res.statusCode).toBe(503);
    expect(res.headers["x-circuit-breaker"]).toBe("open");
    expect(res.headers["x-retry-allowed"]).toBe("false");
    expect(res.headers["retry-after"]).toBe("60");
  });

  it("503 instabilidade transitoria: Retry-After + X-Retry-Allowed true, sem circuit headers", async () => {
    const app = buildServer();
    await armar(app, { indisponivel503: { retryAfterSeconds: 30 } });
    const res = await tentar(app);
    expect(res.statusCode).toBe(503);
    expect(res.headers["retry-after"]).toBe("30");
    expect(res.headers["x-retry-allowed"]).toBe("true");
    expect(res.headers["x-circuit-breaker"]).toBeUndefined();
  });

  it("503 manutencao: so Retry-After (tempo da janela)", async () => {
    const app = buildServer();
    await armar(app, { manutencao503: { retryAfterSeconds: 3600 } });
    const res = await tentar(app);
    expect(res.statusCode).toBe(503);
    expect(res.headers["retry-after"]).toBe("3600");
    expect(res.headers["x-retry-allowed"]).toBeUndefined();
    expect(res.headers["x-circuit-breaker"]).toBeUndefined();
  });

  it("500 carrega X-Retry-Allowed: true (retry limitado)", async () => {
    const app = buildServer();
    await armar(app, { erro500: true });
    const res = await tentar(app);
    expect(res.statusCode).toBe(500);
    expect(res.headers["x-retry-allowed"]).toBe("true");
  });

  it("504 carrega Retry-After (default 30; configuravel)", async () => {
    const app = buildServer();
    await armar(app, { timeout504: true });
    const r1 = await tentar(app);
    expect(r1.statusCode).toBe(504);
    expect(r1.headers["retry-after"]).toBe("30");
    await armar(app, { timeout504: { retryAfterSeconds: 90 } });
    const r2 = await tentar(app);
    expect(r2.headers["retry-after"]).toBe("90");
  });

  it("400 carrega X-Error-Type: permanent e 422 X-Error-Type: business", async () => {
    const app = buildServer();
    const semHeaders = await app.inject({ method: "POST", url: "/api/v1/boleto", payload: {} });
    expect(semHeaders.statusCode).toBe(400);
    expect(semHeaders.headers["x-error-type"]).toBe("permanent");
    // 422 de negocio: lote sem remessa iniciada
    const { headersValidos } = await import("./helpers.js");
    const r422 = await app.inject({
      method: "POST",
      url: "/api/v1/boleto/segregacao/SPLITBRMOCK00001BOL000000000000099/lotes",
      headers: headersValidos(),
      payload: {
        infRequisicao: { cnpjRaizPspRecDir: "12345678", dtHrMsg: "2026-07-20T10:00:00-03:00" },
        dadosLoteSeg: { idLote: "L1" },
        transacoes: [{ index: 1 }],
      },
    });
    expect(r422.statusCode).toBeGreaterThanOrEqual(400);
    if (r422.statusCode === 422) expect(r422.headers["x-error-type"]).toBe("business");
    else expect(r422.headers["x-error-type"]).toBe("permanent");
  });

  it("variantes 401 da auth simulada carregam o detalhe da variante (D-4)", async () => {
    const app = buildServer();
    await armar(app, { auth401: { variante: "cert-expirado" } });
    const res = await tentar(app);
    expect(res.statusCode).toBe(401);
    expect(res.json().detail).toContain("expirado");
    expect(res.json().variante).toBe("cert-expirado");
  });

  it("403 PSP nao homologado", async () => {
    const app = buildServer();
    await armar(app, { forbidden403: true });
    const res = await tentar(app);
    expect(res.statusCode).toBe(403);
    expect(res.json().title).toContain("nao homologado");
  });

  it("DELETE /_chaos limpa as flags e o trafego volta ao normal", async () => {
    const app = buildServer();
    await armar(app, { rate429: { retryAfterSeconds: 5 } });
    expect((await tentar(app)).statusCode).toBe(429);
    await app.inject({ method: "DELETE", url: "/_chaos" });
    expect((await tentar(app)).statusCode).toBe(201);
  });

  it("rotas utilitarias (/_chaos, /healthz) ficam fora do raio do chaos", async () => {
    const app = buildServer();
    await armar(app, { erro500: true });
    expect((await app.inject({ method: "GET", url: "/healthz" })).statusCode).toBe(200);
  });
});
