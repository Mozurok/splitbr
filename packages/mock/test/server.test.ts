import { describe, expect, it } from "vitest";
import { buildServer } from "../src/server.js";
import { headersValidos } from "./helpers.js";

// C1 do TEST_STRATEGY, reescrito para o contrato v1.1.0: o enforcement deixou
// de ser dos 4 headers do v0.0.10 (que sumiram do contrato) e passou a ser da
// forma do X-JWS-Signature.

function appComRotaDeTeste() {
  const app = buildServer();
  app.get("/api/v1/_teste", async () => ({ ok: true }));
  return app;
}

describe("assinatura X-JWS-Signature (C1)", () => {
  it("requisicao assinada passa", async () => {
    const app = appComRotaDeTeste();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/_teste",
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(200);
  });

  // Decisao do mantenedor: sem assinatura o mock deixa passar por padrao, para
  // `npx splitbr-mock` funcionar sem par de chaves. A fidelidade ao contrato
  // fica atras de `exigirAssinatura`.
  it("sem assinatura passa por padrao", async () => {
    const app = appComRotaDeTeste();
    const res = await app.inject({ method: "GET", url: "/api/v1/_teste" });
    expect(res.statusCode).toBe(200);
  });

  it("sem assinatura da 400 quando exigirAssinatura esta ligado", async () => {
    const app = buildServer({ exigirAssinatura: true });
    app.get("/api/v1/_teste", async () => ({ ok: true }));
    const res = await app.inject({ method: "GET", url: "/api/v1/_teste" });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().header).toBe("X-JWS-Signature");
  });

  // O ponto de existir a conferencia de forma: estes sao os erros que passariam
  // por um mock que so olha se o header esta presente, e que a plataforma real
  // rejeitaria.
  const malformados: Array<[string, string]> = [
    ["nao e JWS", "qualquer-coisa"],
    ["payload anexado em vez de detached", (() => {
      const h = headersValidos()["X-JWS-Signature"] as string;
      const [p = "", , a = ""] = h.split(".");
      return `${p}.eyJhIjoxfQ.${a}`;
    })()],
    ["protected header ilegivel", "!!..AAAA"],
  ];
  for (const [caso, valor] of malformados) {
    it(`400 quando a assinatura e malformada: ${caso}`, async () => {
      const app = appComRotaDeTeste();
      const res = await app.inject({
        method: "GET",
        url: "/api/v1/_teste",
        headers: { "X-JWS-Signature": valor },
      });
      expect(res.statusCode).toBe(400);
      expect(res.json().header).toBe("X-JWS-Signature");
      expect(res.json().problemas.length).toBeGreaterThan(0);
    });
  }

  it("os 4 headers do contrato antigo nao sao mais exigidos", async () => {
    const app = appComRotaDeTeste();
    // Nenhum deles presente, e mesmo assim passa: eles sairam do contrato.
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/_teste",
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(200);
  });

  it("correlationId continua sendo ecoado quando vem, por utilidade de debug", async () => {
    const app = appComRotaDeTeste();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/_teste",
      headers: { ...headersValidos(), correlationId: "txn-abc123def456789" },
    });
    expect(res.statusCode).toBe(200);
    expect(res.headers["correlationid"]).toBe("txn-abc123def456789");
  });

  it("rota utilitaria /healthz fica isenta do enforcement", async () => {
    const app = buildServer({ seed: 42 });
    const res = await app.inject({ method: "GET", url: "/healthz" });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ status: "ok", seed: 42 });
  });
});

describe("taxonomia base problem+json", () => {
  it("404 problem+json para rota inexistente", async () => {
    const app = buildServer();
    const res = await app.inject({
      method: "GET",
      url: "/api/v1/nao-existe",
      headers: headersValidos(),
    });
    expect(res.statusCode).toBe(404);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    expect(res.json().status).toBe(404);
  });
});
