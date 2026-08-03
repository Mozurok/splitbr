// Cobre as 9 linhas do TEST_STRATEGY.md da task drift-detector-hardening.
// Sem rede: fetch e injetado; o que se testa aqui e a decisao, nao o transporte.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TARGETS,
  diffSummary,
  exitCodeFor,
  normalize,
  overallStatus,
  report,
  verdictFor,
} from "./drift-check.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const spec = (p) => JSON.parse(readFileSync(resolve(root, p), "utf8"));

const PORTAL = { name: "portal (teste)", severity: "fail" };
const PILOTO = { name: "piloto (teste)", severity: "warn" };

const reachable = (doc) => ({ ok: true, doc });
const unreachable = (error) => ({ ok: false, error });

// O delta real do incidente: cTribNac deixou de aceitar 6 digitos no piloto.
const comSeisDigitos = {
  components: { schemas: { Item: { properties: { cTribNac: { pattern: "^\\d{4}$|^\\d{6}$" } } } } },
};
const soQuatroDigitos = {
  components: { schemas: { Item: { properties: { cTribNac: { pattern: "^\\d{4}$" } } } } },
};

describe("severidade de drift por alvo (D-2)", () => {
  it("linha 1: drift no portal reprova o run", () => {
    const v = verdictFor(PORTAL, comSeisDigitos, reachable(soQuatroDigitos));
    expect(v.status).toBe("drift");
    expect(exitCodeFor([v])).not.toBe(0);
  });

  it("linha 2: drift no piloto relata sem reprovar, e nomeia o que mudou", () => {
    const v = verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos));
    expect(v.status).toBe("drift");
    expect(exitCodeFor([v])).toBe(0);
    expect(v.changed.join("\n")).toContain("cTribNac");
  });
});

describe("severidade de indisponibilidade por alvo (D-3)", () => {
  it("linha 3: portal inalcancavel reprova o run", () => {
    const v = verdictFor(PORTAL, comSeisDigitos, unreachable("HTTP 404"));
    expect(v.status).toBe("unreachable");
    expect(exitCodeFor([v])).not.toBe(0);
  });

  it("linha 4: piloto inalcancavel nao reprova o run", () => {
    const v = verdictFor(PILOTO, comSeisDigitos, unreachable("HTTP 503"));
    expect(v.status).toBe("unreachable");
    expect(exitCodeFor([v])).toBe(0);
  });
});

describe("erro de setup nao e drift (gap 3)", () => {
  it("linha 5: arquivo vendorado ilegivel vira setup-error e reprova mesmo em alvo warn", () => {
    const v = verdictFor(PILOTO, null, reachable(soQuatroDigitos));
    expect(v.status).toBe("setup-error");
    expect(v.status).not.toBe("drift");
    expect(exitCodeFor([v])).not.toBe(0);
  });
});

describe("normalizacao (gap 6 e licao do P0)", () => {
  it("linha 6: servers da raiz e ignorado, servers aninhado e preservado", () => {
    const raizA = { openapi: "3.1.0", servers: [{ url: "https://host:11088/api" }], paths: {} };
    const raizB = { openapi: "3.1.0", servers: [{ url: "https://host:11011/api" }], paths: {} };
    expect(normalize(raizA)).toEqual(normalize(raizB));

    const aninhadoA = { components: { schemas: { Cfg: { properties: { servers: { example: "a" } } } } } };
    const aninhadoB = { components: { schemas: { Cfg: { properties: { servers: { example: "b" } } } } } };
    expect(normalize(aninhadoA)).not.toEqual(normalize(aninhadoB));
  });

  it("linha 7: os specs vendorados reais casam consigo mesmos, e trocar so a porta da raiz nao gera drift", () => {
    const arquivos = [
      "vendor/swagger/calculadora-openapi.portal.json",
      "vendor/swagger/calculadora-openapi.piloto.json",
      "vendor/swagger/api-split-openapi.portal.json",
    ];
    for (const arquivo of arquivos) {
      const doc = spec(arquivo);
      expect(verdictFor(PORTAL, doc, reachable(structuredClone(doc))).status).toBe("match");

      const outraInstancia = structuredClone(doc);
      outraInstancia.servers = [{ url: "https://host:99999/api", description: "outra" }];
      expect(verdictFor(PORTAL, doc, reachable(outraInstancia)).status).toBe("match");
    }
  });
});

describe("composicao de severidade", () => {
  it("linha 8: drift no piloto junto de portal inalcancavel reprova o run", () => {
    const verdicts = [
      verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos)),
      verdictFor(PORTAL, comSeisDigitos, unreachable("timeout")),
    ];
    expect(exitCodeFor(verdicts)).not.toBe(0);
  });

  it("linha 9: api-split segue a mesma severidade do portal, e so o piloto e warn", () => {
    const porNome = (trecho) => TARGETS.find((t) => t.name.includes(trecho));
    expect(porNome("api-split").severity).toBe(porNome("portal").severity);
    expect(porNome("piloto").severity).toBe("warn");
    expect(TARGETS.filter((t) => t.severity === "warn")).toHaveLength(1);
  });
});

// Lacuna encontrada pelo review-hard: as linhas 1 a 9 cobriam so o exitCodeFor,
// entao a decisao de NOTIFICAR nunca foi testada, e o piloto ficou silencioso
// com a suite verde. Estes casos existem por causa disso.
describe("overallStatus decide quem fica sabendo", () => {
  it("piloto divergindo sozinho e informativo, nunca 'ok'", () => {
    const v = verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos));
    expect(overallStatus([v])).toBe("informational");
    expect(overallStatus([v])).not.toBe("ok");
    expect(exitCodeFor([v])).toBe(0);
  });

  it("piloto inalcancavel sozinho tambem e informativo, nao 'ok'", () => {
    const v = verdictFor(PILOTO, comSeisDigitos, unreachable("HTTP 503"));
    expect(overallStatus([v])).toBe("informational");
    expect(exitCodeFor([v])).toBe(0);
  });

  it("tudo casando e 'ok', e isso precisa ser distinguivel do piloto divergindo", () => {
    const casando = verdictFor(PILOTO, comSeisDigitos, reachable(comSeisDigitos));
    const divergindo = verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos));
    expect(overallStatus([casando])).toBe("ok");
    expect(overallStatus([casando])).not.toBe(overallStatus([divergindo]));
  });

  it("alvo de producao divergindo domina o informativo do piloto", () => {
    const verdicts = [
      verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos)),
      verdictFor(PORTAL, comSeisDigitos, reachable(soQuatroDigitos)),
    ];
    expect(overallStatus(verdicts)).toBe("drift");
  });

  it("setup-error tem precedencia sobre qualquer outro status", () => {
    const verdicts = [
      verdictFor(PORTAL, comSeisDigitos, reachable(soQuatroDigitos)),
      verdictFor(PILOTO, null, reachable(soQuatroDigitos)),
    ];
    expect(overallStatus(verdicts)).toBe("setup-error");
    expect(exitCodeFor(verdicts)).not.toBe(0);
  });
});

describe("resposta 200 quebrada nao e indisponibilidade", () => {
  it("corpo nao-JSON vira 'malformed', distinto de 'unreachable'", () => {
    const parseFail = { ok: false, kind: "parse", error: "resposta 200 nao e JSON valido: x" };
    const v = verdictFor(PORTAL, comSeisDigitos, parseFail);
    expect(v.status).toBe("malformed");
    expect(v.status).not.toBe("unreachable");
    expect(exitCodeFor([v])).not.toBe(0);
    expect(overallStatus([v])).toBe("malformed");
  });
});

describe("report", () => {
  it("nomeia o alvo, os caminhos que mudaram, e marca o alvo informativo", () => {
    const linhas = [];
    report([verdictFor(PILOTO, comSeisDigitos, reachable(soQuatroDigitos))], (l) => linhas.push(l));
    const texto = linhas.join("\n");
    expect(texto).toContain("piloto (teste)");
    expect(texto).toContain("cTribNac");
    expect(texto).toContain("não reprova");
  });

  it("nao marca como informativo um alvo que reprova", () => {
    const linhas = [];
    report([verdictFor(PORTAL, comSeisDigitos, reachable(soQuatroDigitos))], (l) => linhas.push(l));
    expect(linhas.join("\n")).not.toContain("não reprova");
  });
});

describe("diffSummary", () => {
  it("nomeia o caminho da chave que mudou e respeita o limite", () => {
    const changed = diffSummary(comSeisDigitos, soQuatroDigitos, 10);
    expect(changed.join("\n")).toContain("cTribNac");
    expect(diffSummary(comSeisDigitos, soQuatroDigitos, 0)).toHaveLength(0);
  });
});
