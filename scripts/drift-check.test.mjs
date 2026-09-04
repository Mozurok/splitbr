// Cobre as 9 linhas do TEST_STRATEGY.md da task drift-detector-hardening.
// Sem rede: fetch e injetado; o que se testa aqui e a decisao, nao o transporte.
import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import {
  TARGETS,
  diffSummary,
  extrairInventario,
  fetchLive,
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

// Adicionados apos o run 30833379724 reprovar por soluco de rede: os tres alvos
// deram "fetch failed" enquanto outro runner falava com os mesmos endpoints 3s
// antes, e o re-run do mesmo commit passou.
describe("fetchLive: retry e causa do erro", () => {
  const alvo = { name: "t", live: "https://exemplo/api-docs", severity: "fail" };
  const semEspera = { esperaMs: 0, dormir: async () => {} };

  it("erro de rede pontual e retentado e o sucesso na 2a tentativa vale", async () => {
    let chamadas = 0;
    const fake = async () => {
      chamadas += 1;
      if (chamadas === 1) throw Object.assign(new TypeError("fetch failed"), { cause: { code: "ECONNRESET" } });
      return { ok: true, status: 200, json: async () => ({ a: 1 }) };
    };
    const r = await fetchLive(alvo, fake, semEspera);
    expect(r.ok).toBe(true);
    expect(r.doc).toEqual({ a: 1 });
    expect(chamadas).toBe(2);
  });

  it("esgotadas as tentativas, devolve falha e conta quantas foram", async () => {
    let chamadas = 0;
    const fake = async () => {
      chamadas += 1;
      throw Object.assign(new TypeError("fetch failed"), { cause: { message: "getaddrinfo ENOTFOUND" } });
    };
    const r = await fetchLive(alvo, fake, { ...semEspera, tentativas: 3 });
    expect(r.ok).toBe(false);
    expect(chamadas).toBe(3);
    expect(r.tentativas).toBe(3);
    expect(verdictFor(alvo, { a: 1 }, r).detail).toContain("apos 3 tentativas");
  });

  it("a mensagem carrega a causa, nao so o 'fetch failed' generico", async () => {
    const fake = async () => {
      throw Object.assign(new TypeError("fetch failed"), { cause: { message: "certificate has expired" } });
    };
    const r = await fetchLive(alvo, fake, { ...semEspera, tentativas: 1 });
    expect(r.error).toContain("fetch failed");
    expect(r.error).toContain("certificate has expired");
  });

  it("404 NAO e retentado: resposta definitiva, insistir so atrasa o sinal", async () => {
    let chamadas = 0;
    const fake = async () => {
      chamadas += 1;
      return { ok: false, status: 404, json: async () => ({}) };
    };
    const r = await fetchLive(alvo, fake, semEspera);
    expect(chamadas).toBe(1);
    expect(r.error).toBe("HTTP 404");
  });

  it("500 e retentado, porque e transitorio do lado deles", async () => {
    let chamadas = 0;
    const fake = async () => {
      chamadas += 1;
      if (chamadas < 3) return { ok: false, status: 503, json: async () => ({}) };
      return { ok: true, status: 200, json: async () => ({ b: 2 }) };
    };
    const r = await fetchLive(alvo, fake, semEspera);
    expect(chamadas).toBe(3);
    expect(r.ok).toBe(true);
  });

  it("corpo quebrado nao e retentado: o host respondeu, o contrato e que veio torto", async () => {
    let chamadas = 0;
    const fake = async () => {
      chamadas += 1;
      return { ok: true, status: 200, json: async () => { throw new SyntaxError("Unexpected token"); } };
    };
    const r = await fetchLive(alvo, fake, semEspera);
    expect(chamadas).toBe(1);
    expect(r.kind).toBe("parse");
    expect(verdictFor(alvo, { a: 1 }, r).status).toBe("malformed");
  });
});

describe("diffSummary", () => {
  it("nomeia o caminho da chave que mudou e respeita o limite", () => {
    const changed = diffSummary(comSeisDigitos, soQuatroDigitos, 10);
    expect(changed.join("\n")).toContain("cTribNac");
    expect(diffSummary(comSeisDigitos, soQuatroDigitos, 0)).toHaveLength(0);
  });
});

// O quarto alvo existe porque a premissa oposta custou 11 dias de deteccao: o
// OAS v1.1.0 saiu em 24/08/2026 numa pagina publica que ninguem observava.
describe("inventario de artefatos do CGIBS (quarto alvo)", () => {
  const CGIBS = { name: "cgibs (teste)", severity: "fail", kind: "inventario-html" };
  const pagina = (hrefs) =>
    `<html><body>${hrefs.map((h) => `<a href="${h}">doc</a>`).join("")}</body></html>`;

  it("extrai so os links de /upload/arquivos/, sem o host", () => {
    const doc = extrairInventario(
      pagina([
        "https://www.cgibs.gov.br/upload/arquivos/202608/24154448-openapi-v1-1-0.zip",
        "/upload/arquivos/202606/03172158-openapi-v0-0-10.zip",
        "/institucional/quem-somos",
      ]),
    );
    expect(Object.keys(doc.artefatos).sort()).toEqual([
      "/upload/arquivos/202606/03172158-openapi-v0-0-10.zip",
      "/upload/arquivos/202608/24154448-openapi-v1-1-0.zip",
    ]);
  });

  it("artefato novo na pagina vira drift que reprova, nomeando o arquivo", () => {
    const pinado = { artefatos: { "/upload/arquivos/202606/03172158-openapi-v0-0-10.zip": true } };
    const vivo = extrairInventario(
      pagina([
        "/upload/arquivos/202606/03172158-openapi-v0-0-10.zip",
        "/upload/arquivos/202608/24154448-openapi-v1-1-0.zip",
      ]),
    );
    const v = verdictFor(CGIBS, pinado, reachable(vivo));
    expect(v.status).toBe("drift");
    expect(exitCodeFor([v])).not.toBe(0);
    expect(v.changed.join(" ")).toContain("24154448-openapi-v1-1-0.zip");
  });

  it("a data de captura do arquivo pinado nao conta como conteudo", () => {
    const pinado = {
      _meta: {
        descricao: "inventario",
        fonte: "https://www.cgibs.gov.br/split-payment",
        capturadoEm: "2026-09-04",
      },
      artefatos: { "/upload/arquivos/202606/x.zip": true },
    };
    const vivo = { artefatos: { "/upload/arquivos/202606/x.zip": true } };
    expect(verdictFor(CGIBS, pinado, reachable(vivo)).status).toBe("match");
  });

  it("pagina sem nenhum artefato e corpo quebrado, nao inventario vazio", async () => {
    // O desafio anti-bot do gov.br responde 200 com HTML. Aceitar isso como
    // sucesso apagaria o inventario pinado inteiro no proximo re-pin.
    const fetchImpl = async () => new Response("<html>Acesso negado</html>", { status: 200 });
    const r = await fetchLive({ ...CGIBS, live: "https://exemplo" }, fetchImpl);
    expect(r.ok).toBe(false);
    expect(r.kind).toBe("parse");
    expect(verdictFor(CGIBS, { artefatos: {} }, r).status).toBe("malformed");
  });

  it("o alvo esta registrado em TARGETS e reprova o run", () => {
    const alvo = TARGETS.find((t) => t.kind === "inventario-html");
    expect(alvo).toBeDefined();
    expect(alvo.severity).toBe("fail");
    expect(alvo.vendored).toBe("vendor/cgibs-split-payment-artefatos.json");
  });

  it("o inventario pinado no repo bate com o alvo declarado", () => {
    const alvo = TARGETS.find((t) => t.kind === "inventario-html");
    const pinado = spec(alvo.vendored);
    expect(Object.keys(pinado.artefatos).length).toBeGreaterThan(0);
    expect(pinado._meta.fonte).toBe(alvo.live);
  });
});

// Terceira via de severidade: o host do CGIBS nao aceita conexao do runner do
// GitHub, e reprovar por isso deixaria o detector vermelho toda semana por uma
// causa externa que nao vamos consertar.
describe("severidade de indisponibilidade separada da de drift", () => {
  const CGIBS = {
    name: "cgibs (teste)",
    severity: "fail",
    severidadeIndisponivel: "ignore",
    kind: "inventario-html",
  };
  const pinado = { artefatos: { "/upload/arquivos/202606/x.zip": true } };

  it("indisponibilidade no alvo ignorado nao reprova o run", () => {
    const v = verdictFor(CGIBS, pinado, { ok: false, error: "Connect Timeout Error", tentativas: 3 });
    expect(v.status).toBe("unreachable");
    expect(v.severity).toBe("ignore");
    expect(exitCodeFor([v])).toBe(0);
  });

  it("indisponibilidade ignorada tambem nao abre issue", () => {
    const v = verdictFor(CGIBS, pinado, { ok: false, error: "Connect Timeout Error" });
    expect(overallStatus([v])).toBe("ok");
  });

  it("mas drift no mesmo alvo continua reprovando", () => {
    const vivo = { artefatos: { "/upload/arquivos/202608/novo.zip": true } };
    const v = verdictFor(CGIBS, pinado, { ok: true, doc: vivo });
    expect(v.status).toBe("drift");
    expect(v.severity).toBe("fail");
    expect(exitCodeFor([v])).not.toBe(0);
    expect(overallStatus([v])).toBe("drift");
  });

  it("o relatorio diz por que nao reprovou, em vez de sumir com o alvo", () => {
    const linhas = [];
    report([verdictFor(CGIBS, pinado, { ok: false, error: "Connect Timeout Error" })], (l) => linhas.push(l));
    const texto = linhas.join("\n");
    expect(texto).toContain("UNREACHABLE");
    expect(texto).toContain("drift ali continua reprovando");
  });

  it("um alvo sem severidadeIndisponivel mantem o comportamento antigo", () => {
    const PORTAL = { name: "portal (teste)", severity: "fail" };
    const v = verdictFor(PORTAL, { a: 1 }, { ok: false, error: "fetch failed" });
    expect(v.severity).toBe("fail");
    expect(exitCodeFor([v])).not.toBe(0);
  });

  it("o alvo real do CGIBS declara a severidade separada", () => {
    const alvo = TARGETS.find((t) => t.kind === "inventario-html");
    expect(alvo.severity).toBe("fail");
    expect(alvo.severidadeIndisponivel).toBe("ignore");
  });
});
