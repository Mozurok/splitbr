import { describe, expect, it } from "vitest";
import {
  gerarCorrelationId,
  gerarTimestampSplit,
  splitHeadersMiddleware,
} from "../src/headers.js";

// Oraculo: manual vendorado (tabela de headers): messageId UUID v4 (36),
// correlationId 19/19, tenantId alfanumerico 14/14, timestamp 25/25 no formato
// 2025-12-22T14:30:45-03:00.

const UUID_V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TIMESTAMP_SPLIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;

async function runMiddleware(mw: ReturnType<typeof splitHeadersMiddleware>) {
  const request = new Request("https://example.invalid/api/v1/boleto", { method: "POST" });
  const result = await mw.onRequest?.({ request, schemaPath: "/api/v1/boleto" } as never);
  return (result instanceof Request ? result : request).headers;
}

describe("splitHeadersMiddleware (C7: messageId)", () => {
  it("gera UUID v4 unico por requisicao", async () => {
    const mw = splitHeadersMiddleware({ tenantId: "12345678000199" });
    const h1 = await runMiddleware(mw);
    const h2 = await runMiddleware(mw);
    expect(h1.get("messageId")).toMatch(UUID_V4);
    expect(h2.get("messageId")).toMatch(UUID_V4);
    expect(h1.get("messageId")).not.toBe(h2.get("messageId"));
  });
});

describe("splitHeadersMiddleware (C8: correlationId)", () => {
  it("propaga verbatim quando fornecido (19 posicoes)", async () => {
    const fixo = "txn-20251222-abc123";
    expect(fixo).toHaveLength(19);
    const mw = splitHeadersMiddleware({ tenantId: "12345678000199", correlationId: fixo });
    expect((await runMiddleware(mw)).get("correlationId")).toBe(fixo);
  });
  it("gera 19 posicoes quando ausente", async () => {
    const mw = splitHeadersMiddleware({ tenantId: "12345678000199" });
    expect((await runMiddleware(mw)).get("correlationId")).toHaveLength(19);
  });
  it("gerarCorrelationId() sempre tem 19 posicoes", () => {
    for (let i = 0; i < 50; i++) expect(gerarCorrelationId()).toHaveLength(19);
  });
  it("rejeita correlationId fornecido com tamanho errado", () => {
    expect(() =>
      splitHeadersMiddleware({ tenantId: "12345678000199", correlationId: "curto" }),
    ).toThrow(/19/);
  });
});

describe("splitHeadersMiddleware (C9: timestamp)", () => {
  it("formato ISO 8601 com offset -03:00, 25 posicoes, sem milissegundos", async () => {
    const mw = splitHeadersMiddleware({ tenantId: "12345678000199" });
    const ts = (await runMiddleware(mw)).get("timestamp")!;
    expect(ts).toMatch(TIMESTAMP_SPLIT);
    expect(ts).toHaveLength(25);
  });
  it("gerarTimestampSplit converte o instante para o relogio de Brasilia", () => {
    // 2025-12-22T17:30:45Z == 14:30:45 em -03:00 (exemplo do manual)
    expect(gerarTimestampSplit(new Date("2025-12-22T17:30:45Z"))).toBe("2025-12-22T14:30:45-03:00");
  });
});

describe("splitHeadersMiddleware (C10: tenantId)", () => {
  it("passa o CNPJ adiante, tolerando CNPJ alfanumerico", async () => {
    const alfanum = "AB345678000199"; // IN RFB 2.229/2024
    const mw = splitHeadersMiddleware({ tenantId: alfanum });
    expect((await runMiddleware(mw)).get("tenantId")).toBe(alfanum);
  });
  it("rejeita tenantId fora de 14 posicoes alfanumericas", () => {
    expect(() => splitHeadersMiddleware({ tenantId: "123" })).toThrow(/14/);
    expect(() => splitHeadersMiddleware({ tenantId: "12345678-00019" })).toThrow(/alfanum/i);
  });
});
