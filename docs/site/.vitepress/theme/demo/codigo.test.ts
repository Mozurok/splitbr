import { describe, expect, it } from "vitest";
import { snippetCodigo } from "./codigo";
import { payloadsCicloFeliz } from "./dados";
import { readFileSync } from "node:fs";

const contrato = JSON.parse(
  readFileSync(new URL("../../../../../vendor/swagger/openapi-v1_1_1.json", import.meta.url), "utf8"),
) as { paths: Record<string, Record<string, unknown>> };

// A demo mostrou o contrato v0.0.10 (tenantId, rota {psp}/tributos) por toda a
// linha 0.2.x sem que nada falhasse. Estes testes amarram o que ela exibe ao
// contrato que o client realmente gera.
describe("snippet de codigo da demo", () => {
  it("configura o client com kid e assinar, sem tenantId", () => {
    const s = snippetCodigo("POST /api/v1/boleto", 100_000, 900, 100);
    expect(s).toContain("kid:");
    expect(s).toContain("assinar:");
    expect(s).not.toContain("tenantId");
  });

  it("o GET do stream passa o parametro de rota", () => {
    const s = snippetCodigo(payloadsCicloFeliz.retorno.endpoint, 0, 0, 0);
    expect(s).toContain('params: { path: { cnpjRaizPspRecDir: "12345678" } }');
  });

  it("as rotas e metodos exibidos existem no contrato oficial", () => {
    for (const { endpoint } of Object.values(payloadsCicloFeliz)) {
      const [metodo, rota] = endpoint.split(" ") as [string, string];
      expect(contrato.paths[rota]?.[metodo.toLowerCase()], endpoint).toBeDefined();
    }
  });
});
