import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { PINNED_SPEC_SHA256, SpecGateError, verificarSpec } from "../src/spec/gate.js";
import { carregarSpec } from "../src/spec/load.js";
import { paraRotaFastify } from "../src/spec/routes.js";

const SPEC_EMBARCADO = fileURLToPath(
  new URL("../data/spec/openapi-v0_0_10.json", import.meta.url),
);

describe("trava de hash do spec (C2)", () => {
  it("aceita a copia embarcada intacta", () => {
    expect(() => verificarSpec(readFileSync(SPEC_EMBARCADO))).not.toThrow();
  });

  it("recusa bytes adulterados", () => {
    const bytes = readFileSync(SPEC_EMBARCADO);
    const adulterado = Buffer.from(bytes);
    adulterado[100] = adulterado[100]! ^ 0xff;
    expect(() => verificarSpec(adulterado)).toThrow(SpecGateError);
  });

  it("carregarSpec recusa arquivo adulterado (boot barrado)", () => {
    const dir = mkdtempSync(join(tmpdir(), "splitbr-mock-"));
    const alterado = join(dir, "spec.json");
    const doc = JSON.parse(readFileSync(SPEC_EMBARCADO, "utf8"));
    doc.info.title = "adulterado";
    writeFileSync(alterado, JSON.stringify(doc));
    expect(() => carregarSpec(alterado)).toThrow(SpecGateError);
  });

  it("copia embarcada e vendor/ nao driftam (hash da copia == pinado do MANIFEST)", () => {
    const manifest = readFileSync(
      fileURLToPath(new URL("../../../vendor/MANIFEST.md", import.meta.url)),
      "utf8",
    );
    const row = manifest
      .split("\n")
      .find((l) => l.includes("swagger/openapi-v0_0_10.json"));
    expect(row).toBeDefined();
    const pinado = row!.match(/\b([0-9a-f]{64})\b/)?.[1];
    expect(pinado).toBe(PINNED_SPEC_SHA256);
    const local = createHash("sha256")
      .update(readFileSync(SPEC_EMBARCADO))
      .digest("hex");
    expect(local).toBe(PINNED_SPEC_SHA256);
  });
});

describe("carregamento e compilacao (C3)", () => {
  const registro = carregarSpec();

  it("registra 32/32 paths do contrato", () => {
    expect(registro.totalPaths).toBe(32);
  });

  it("toda operacao com requestBody tem validador compilado", () => {
    const comBody = registro.operacoes.filter((o) => o.temBody);
    expect(comBody.length).toBeGreaterThan(0);
    for (const op of comBody) expect(op.validarBody).toBeTypeOf("function");
  });

  it("validador real rejeita corpo vazio onde o schema exige campos", () => {
    const comBody = registro.operacoes.filter((o) => o.temBody && o.validarBody);
    const rejeitou = comBody.some((op) => op.validarBody!({}) === false);
    expect(rejeitou).toBe(true);
  });
});

describe("multipleOf 0.01 sem bug de float (regressao review-hard M2)", () => {
  it("aceita valores monetarios validos hostis a float (10.02, 19.99, 1234.56...)", () => {
    const registro = carregarSpec();
    const op = registro.operacoes.find(
      (o) => o.method === "post" && o.path === "/api/v1/boleto/informe-preliminar-pagamento",
    )!;
    const hostis = [10.02, 19.99, 1234.56, 0.07, 999999.99, 617977.13];
    for (const valor of hostis) {
      const body = {
        infRequisicao: { dtHrMsg: "2026-07-20T10:00:00-03:00" },
        transacoes: [
          {
            index: 1,
            idDda: "DDA1",
            numCtrlOrig: "C1",
            numPgto: 1,
            numIdentcBaixa: 1,
            vlPago: valor,
            vlCbsSegr: valor,
            vlIbsSegr: valor,
            indPgtoIntegral: "1",
            cnpjRaizPspRecDir: "12345678",
            cnpjRaizPspPag: "87654321",
            cnpjRec: "12345678000199",
            dtHrPgto: "2026-07-20T10:00:00-03:00",
          },
        ],
      };
      const ok = op.validarBody!(body);
      if (!ok) throw new Error(`valor valido ${valor} rejeitado: ${JSON.stringify(op.validarBody!.errors)}`);
    }
  });
});

describe("mapeamento de rota", () => {
  it("converte template OAS para sintaxe Fastify", () => {
    expect(paraRotaFastify("/api/v1/{arranjo}/segregacao/{idInfSegr}/lotes")).toBe(
      "/api/v1/:arranjo/segregacao/:idInfSegr/lotes",
    );
  });
});
