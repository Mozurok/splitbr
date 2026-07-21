import { describe, expect, it } from "vitest";
import Fastify from "fastify";
import {
  carregarMatriz,
  errosParaProblem,
  validarContraMatriz,
  type Arranjo,
} from "../src/domain/matrices.js";
import {
  CNPJ_ALFANUMERICO,
  CNPJ_RAIZ,
  gerarIdInfSegr,
  gerarIdRepasse,
  ID_INF_SEGR,
  ID_REPASSE,
} from "../src/domain/ids.js";
import { sendProblem } from "../src/plugins/problem.js";

// C4/C5 do TEST_STRATEGY: matrizes M/O/N-E como dados + regexes do manual.

function itemIniciadaBoleto(): Record<string, unknown> {
  return {
    index: 1,
    idDda: "123",
    numCtrlOrig: "abc",
    numCodBarras: "001",
    vlInf: 10_000,
    vlCbsInf: 90,
    vlIbsInf: 10,
    cnpjRaizPspRecDir: "12345678",
    cnpjRec: "12345678000199",
    cnpjCpfPagOrig: "98765432000188",
    dtHrIni: "2026-07-20T10:00:00-03:00",
    dtVenc: "2026-08-01",
    dtHrLimPgto: "2026-08-01T23:59:59-03:00",
  };
}

describe("validarContraMatriz (C4)", () => {
  const iniciada = carregarMatriz("transacao-iniciada");

  it("payload valido de boleto passa sem erros", () => {
    const erros = validarContraMatriz(iniciada, "boleto", {
      dtHrMsg: "2026-07-20T10:00:00-03:00",
      transacoes: [itemIniciadaBoleto()],
    });
    expect(erros).toEqual([]);
  });

  it("campo M ausente e apontado com indice (idDda no boleto)", () => {
    const item = itemIniciadaBoleto();
    delete item["idDda"];
    const erros = validarContraMatriz(iniciada, "boleto", {
      dtHrMsg: "x",
      transacoes: [item],
    });
    expect(erros).toContainEqual({ campo: "idDda", indice: 0, motivo: "mandatorio-ausente" });
  });

  it("campo N/E presente e rejeitado (idDda no pix-dinamico)", () => {
    const erros = validarContraMatriz(iniciada, "pix-dinamico", {
      dtHrMsg: "x",
      transacoes: [{ index: 1, idDda: "nao-devia", txId: "t1" }],
    });
    expect(erros).toContainEqual({ campo: "idDda", indice: 0, motivo: "nao-existe-para-arranjo" });
  });

  it("campo O passa presente e ausente (docFiscal)", () => {
    const com = validarContraMatriz(iniciada, "boleto", {
      dtHrMsg: "x",
      transacoes: [{ ...itemIniciadaBoleto(), docFiscal: "NFe123" }],
    });
    const sem = validarContraMatriz(iniciada, "boleto", {
      dtHrMsg: "x",
      transacoes: [itemIniciadaBoleto()],
    });
    expect(com.filter((e) => e.campo === "docFiscal")).toEqual([]);
    expect(sem.filter((e) => e.campo === "docFiscal")).toEqual([]);
  });

  it("difere por arranjo vindo puramente dos dados: cnpjRaizPspPag M no ted, N/E no tef (preliminar)", () => {
    const preliminar = carregarMatriz("informe-preliminar");
    const semPag = validarContraMatriz(preliminar, "ted", {
      dtHrMsg: "x",
      transacoes: [{ index: 1 }],
    });
    expect(semPag).toContainEqual({ campo: "cnpjRaizPspPag", indice: 0, motivo: "mandatorio-ausente" });
    const comPagNoTef = validarContraMatriz(preliminar, "tef", {
      dtHrMsg: "x",
      transacoes: [{ index: 1, cnpjRaizPspPag: "12345678" }],
    });
    expect(comPagNoTef).toContainEqual({ campo: "cnpjRaizPspPag", indice: 0, motivo: "nao-existe-para-arranjo" });
  });

  it("topo tambem valida (idLote mandatorio no lote)", () => {
    const lote = carregarMatriz("segregacao-lote");
    const erros = validarContraMatriz(lote, "boleto", {
      cnpjRaizPspRecDir: "12345678",
      dtHrMsg: "x",
      idInfSegr: "y",
      transacoes: [],
    });
    expect(erros).toContainEqual({ campo: "idLote", motivo: "mandatorio-ausente" });
  });

  it("arranjo fora da matriz e erro de programacao, nao de payload", () => {
    expect(() => validarContraMatriz(iniciada, "ted", { dtHrMsg: "x" })).toThrow(/fora da matriz/);
  });
});

describe("400 problem+json nomeando campo e arranjo (C4, criterio EARS)", () => {
  it("rota responde 400 com campo e arranjo no detail, guiada pelos dados", async () => {
    const app = Fastify();
    const iniciada = carregarMatriz("transacao-iniciada");
    app.post("/api/v1/:arranjo", async (req, reply) => {
      const arranjo = (req.params as { arranjo: Arranjo }).arranjo;
      const erros = validarContraMatriz(iniciada, arranjo, req.body as Record<string, unknown>);
      if (erros.length > 0) return sendProblem(reply, errosParaProblem(iniciada, arranjo, erros));
      return { ok: true };
    });
    const res = await app.inject({
      method: "POST",
      url: "/api/v1/pix-dinamico",
      payload: { dtHrMsg: "x", transacoes: [{ index: 1, idDda: "intruso", txId: "t" }] },
    });
    expect(res.statusCode).toBe(400);
    expect(res.headers["content-type"]).toContain("application/problem+json");
    const body = res.json();
    expect(body.detail).toContain("idDda");
    expect(body.detail).toContain("pix-dinamico");
    expect(body.arranjo).toBe("pix-dinamico");
  });
});

describe("regexes-chave do manual (C5)", () => {
  it("idRepasse: 16 alfanumericos + codigo de arranjo + 11 digitos (30 posicoes)", () => {
    const valido = gerarIdRepasse("boleto", 7);
    expect(valido).toHaveLength(30);
    expect(ID_REPASSE.test(valido)).toBe(true);
    expect(ID_REPASSE.test(valido.replace("BOL", "XXX"))).toBe(false);
    expect(ID_REPASSE.test(valido.slice(0, 29))).toBe(false);
  });

  it("idInfSegr: mesmo prefixo + 15 digitos (34 posicoes)", () => {
    const valido = gerarIdInfSegr("pix-dinamico", 3);
    expect(valido).toHaveLength(34);
    expect(ID_INF_SEGR.test(valido)).toBe(true);
    expect(ID_INF_SEGR.test(`${valido}9`)).toBe(false);
  });

  it("geradores sao deterministicos no mesmo contador (D-3)", () => {
    expect(gerarIdRepasse("ted", 42)).toBe(gerarIdRepasse("ted", 42));
    expect(gerarIdRepasse("ted", 42)).not.toBe(gerarIdRepasse("ted", 43));
  });

  it("CNPJ alfanumerico 14 posicoes e raiz 8 posicoes", () => {
    expect(CNPJ_ALFANUMERICO.test("12ABC678000199")).toBe(true);
    expect(CNPJ_ALFANUMERICO.test("123")).toBe(false);
    expect(CNPJ_RAIZ.test("12ABC678")).toBe(true);
    expect(CNPJ_RAIZ.test("12ABC6789")).toBe(false);
  });
});

describe("integridade das matrizes transcritas", () => {
  const esperado: Array<[string, number]> = [
    ["transacao-iniciada", 3],
    ["transacao-atualizada", 3],
    ["baixa", 3],
    ["informe-preliminar", 6],
    ["segregacao-remessa", 6],
    ["segregacao-lote", 6],
    ["segregacao-finalizacao", 6],
    ["super-inteligente", 3],
  ];
  for (const [informe, arranjos] of esperado) {
    it(`${informe}: carrega com ${arranjos} arranjos e regras validas`, () => {
      const m = carregarMatriz(informe);
      expect(m.arranjos).toHaveLength(arranjos);
      for (const secao of ["topo", "transacoes"] as const) {
        for (const regras of Object.values(m[secao])) {
          expect(regras).toHaveLength(arranjos);
          for (const r of regras) expect(["M", "O", "NE"]).toContain(r);
        }
      }
    });
  }
});
