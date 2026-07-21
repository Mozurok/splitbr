import { describe, expect, it } from "vitest";
import { gerarCorrelationId, gerarTimestampSplit } from "@splitbr/client";
import { buildServer } from "../src/server.js";

// C1 do TEST_STRATEGY: enforcement dos 4 headers obrigatorios da tabela do
// Manual de Integracao em /api/*, com problem+json nomeando o header.

function headersValidos(): Record<string, string> {
  return {
    messageId: crypto.randomUUID(),
    correlationId: gerarCorrelationId(),
    tenantId: "12345678000199",
    timestamp: gerarTimestampSplit(),
  };
}

function appComRotaDeTeste() {
  const app = buildServer();
  app.get("/api/v1/_teste", async () => ({ ok: true }));
  return app;
}

describe("headers obrigatorios (C1)", () => {
  for (const ausente of ["messageId", "correlationId", "tenantId", "timestamp"]) {
    it(`400 nomeando '${ausente}' quando ausente`, async () => {
      const app = appComRotaDeTeste();
      const h = headersValidos();
      delete h[ausente];
      const res = await app.inject({ method: "GET", url: "/api/v1/_teste", headers: h });
      expect(res.statusCode).toBe(400);
      expect(res.headers["content-type"]).toContain("application/problem+json");
      const body = res.json();
      expect(body.header).toBe(ausente);
      expect(body.detail).toContain(ausente);
    });
  }

  const invalidos: Array<[string, string]> = [
    ["messageId", "nao-e-uuid"],
    ["correlationId", "curto"],
    ["tenantId", "123"],
    ["timestamp", "2026-07-20T10:00:00Z"],
    ["timestamp", "2026-07-20T10:00:00.123-03:00"],
  ];
  for (const [header, valor] of invalidos) {
    it(`400 nomeando '${header}' quando invalido (${valor})`, async () => {
      const app = appComRotaDeTeste();
      const h = { ...headersValidos(), [header]: valor };
      const res = await app.inject({ method: "GET", url: "/api/v1/_teste", headers: h });
      expect(res.statusCode).toBe(400);
      expect(res.json().header).toBe(header);
    });
  }

  it("headers validos passam e o correlationId e ecoado na resposta", async () => {
    const app = appComRotaDeTeste();
    const h = headersValidos();
    const res = await app.inject({ method: "GET", url: "/api/v1/_teste", headers: h });
    expect(res.statusCode).toBe(200);
    expect(res.headers["correlationid"]).toBe(h.correlationId);
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
