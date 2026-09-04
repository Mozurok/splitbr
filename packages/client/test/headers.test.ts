// O contrato v1.1.0 apagou os quatro headers do v0.0.10 (messageId,
// correlationId, tenantId, timestamp) e pôs no lugar um só, o
// X-JWS-Signature, obrigatório nas 43 operações. Este arquivo testava a
// injeção dos quatro; agora testa a assinatura.
//
// O ponto mais delicado do middleware é a reescrita do corpo. A assinatura
// cobre o payload cru (b64=false), então o corpo que vai na rede tem que ser
// byte a byte o mesmo que foi assinado. Deixar o `fetch` re-serializar o objeto
// original produziria uma assinatura válida sobre bytes que ninguém enviou.
import { describe, expect, it } from "vitest";
import { assinaturaMiddleware, gerarTimestampSplit } from "../src/headers.js";
import { conferirFormaDoHeader, montarEntradaDeAssinatura } from "../src/assinatura.js";

const TIMESTAMP_SPLIT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;
const assinanteEspelho = (bytes: Uint8Array) => bytes;

async function rodar(corpo?: unknown, metodo = "POST") {
  const mw = assinaturaMiddleware({ kid: "chave-01", assinar: assinanteEspelho });
  const init: RequestInit = { method: metodo };
  if (corpo !== undefined) {
    init.body = JSON.stringify(corpo);
    init.headers = { "content-type": "application/json" };
  }
  const request = new Request("https://example.invalid/api/v1/boleto", init);
  const saida = await mw.onRequest?.({ request, schemaPath: "/api/v1/boleto" } as never);
  return saida instanceof Request ? saida : request;
}

describe("assinaturaMiddleware", () => {
  it("injeta X-JWS-Signature em formato válido", async () => {
    const req = await rodar({ a: 1 });
    const header = req.headers.get("X-JWS-Signature");
    expect(header).toBeTruthy();
    expect(conferirFormaDoHeader(header as string).problemas).toEqual([]);
  });

  it("reescreve o corpo com os bytes canonicalizados", async () => {
    // Entra com as chaves fora de ordem; tem que sair ordenado.
    const req = await rodar({ vlPago: 10.02, arrj: "BOL" });
    expect(await req.text()).toBe('{"arrj":"BOL","vlPago":10.02}');
  });

  it("o corpo enviado é exatamente o que foi assinado", async () => {
    let assinado: Uint8Array | undefined;
    const mw = assinaturaMiddleware({
      kid: "chave-01",
      assinar: (bytes) => {
        assinado = bytes;
        return bytes;
      },
    });
    const request = new Request("https://example.invalid/api/v1/boleto", {
      method: "POST",
      body: JSON.stringify({ b: 2, a: 1 }),
      headers: { "content-type": "application/json" },
    });
    const saida = (await mw.onRequest?.({ request, schemaPath: "/x" } as never)) as Request;

    const enviado = new TextEncoder().encode(await saida.text());
    const [protectedB64 = ""] = (saida.headers.get("X-JWS-Signature") as string).split(".");
    expect(assinado).toEqual(montarEntradaDeAssinatura(protectedB64, enviado));
  });

  it("assina também requisição sem corpo, porque o header é obrigatório nelas", async () => {
    const req = await rodar(undefined, "GET");
    const header = req.headers.get("X-JWS-Signature");
    expect(conferirFormaDoHeader(header as string).problemas).toEqual([]);
    expect(await req.text()).toBe("");
  });

  it("cada requisição ganha jti próprio", async () => {
    const a = await rodar({ a: 1 });
    const b = await rodar({ a: 1 });
    expect(a.headers.get("X-JWS-Signature")).not.toBe(b.headers.get("X-JWS-Signature"));
  });

  it("não injeta nenhum dos quatro headers do contrato antigo", async () => {
    const req = await rodar({ a: 1 });
    for (const extinto of ["messageId", "correlationId", "tenantId", "timestamp"]) {
      expect(req.headers.get(extinto)).toBeNull();
    }
  });

  it("preserva método e URL", async () => {
    const req = await rodar({ a: 1 });
    expect(req.method).toBe("POST");
    expect(req.url).toBe("https://example.invalid/api/v1/boleto");
  });
});

describe("gerarTimestampSplit", () => {
  // Sobrevive ao v1.1.0 por outro motivo: deixou de ser header e continua
  // sendo o formato de infRequisicao.dtHrMsg, campo de corpo obrigatório.
  it("formato ISO 8601 com offset -03:00, 25 posições, sem milissegundos", () => {
    const t = gerarTimestampSplit(new Date("2026-03-22T15:00:00Z"));
    expect(t).toMatch(TIMESTAMP_SPLIT);
    expect(t).toHaveLength(25);
    expect(t).toBe("2026-03-22T12:00:00-03:00");
  });
});
