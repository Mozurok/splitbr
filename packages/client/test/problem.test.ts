import { describe, expect, it } from "vitest";
import { toProblem } from "../src/problem.js";

// R1/R2 do TEST_STRATEGY: problem+json vira ProblemDetail tipado; 429 expoe
// Retry-After; 503 expoe X-Circuit-Breaker / X-Retry-Allowed; 400/422 expoe X-Error-Type.

const mkResponse = (status: number, headers: Record<string, string> = {}) =>
  new Response(null, { status, headers });

describe("toProblem (R1: mapeamento problem+json)", () => {
  it("mapeia corpo 422 com extensoes preservadas", () => {
    const p = toProblem(
      { title: "Erro de negocio", status: 422, detail: "idInfSegr nao encontrado", idInfSegr: "X" },
      mkResponse(422),
    );
    expect(p.status).toBe(422);
    expect(p.title).toBe("Erro de negocio");
    expect(p.detail).toBe("idInfSegr nao encontrado");
    expect(p.extensions["idInfSegr"]).toBe("X");
  });
  it("corpo ausente ainda produz ProblemDetail com o status da resposta", () => {
    const p = toProblem(undefined, mkResponse(500));
    expect(p.status).toBe(500);
  });
});

describe("toProblem (R2: headers operacionais)", () => {
  it("429 expoe Retry-After em segundos", () => {
    const p = toProblem({ status: 429 }, mkResponse(429, { "Retry-After": "30" }));
    expect(p.retryAfterSeconds).toBe(30);
  });
  it("503 expoe X-Circuit-Breaker e X-Retry-Allowed (nomes hifenizados do manual)", () => {
    const p = toProblem(
      { status: 503 },
      mkResponse(503, {
        "X-Circuit-Breaker": "OPEN",
        "X-Retry-Allowed": "false",
        "Retry-After": "60",
      }),
    );
    expect(p.circuitBreaker).toBe("OPEN");
    expect(p.retryAllowed).toBe("false");
    expect(p.retryAfterSeconds).toBe(60);
  });
});
