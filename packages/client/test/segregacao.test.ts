import { describe, expect, it } from "vitest";
import { calcularSegregacao } from "../src/domain/segregacao.js";

// Oraculo: R = min((Vp/Vt) x C; C; A), truncar PARA BAIXO, por tributo.
// Cenarios C1-C6 do TEST_STRATEGY.md.

describe("calcularSegregacao (C1: truncamento para baixo)", () => {
  it("trunca 12.35954 para 12.35 (nunca arredonda)", () => {
    // proporcional = 617977 x 2000 / 1000000 = 1235.954 centavos => trunca 1235;
    // C (2000) e A (999999) folgados para o termo proporcional vencer o min.
    expect(
      calcularSegregacao({
        valorPagoCentavos: 617_977,
        valorOriginalCentavos: 1_000_000,
        informadoCentavos: 2_000,
        emAbertoCentavos: 999_999,
      }),
    ).toBe(1_235); // 12.35, nao 12.36
  });
});

describe("calcularSegregacao (C2: cada componente vence no seu caso)", () => {
  it("proporcional vence quando e o menor", () => {
    // Vp=50, Vt=100, C=10 => proporcional 5.00 < C 10.00 < A 20.00
    expect(
      calcularSegregacao({
        valorPagoCentavos: 5_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
        emAbertoCentavos: 2_000,
      }),
    ).toBe(500);
  });
  it("C vence quando pagamento integral e A folgado", () => {
    // Vp=Vt => proporcional = C; min(C, C, A=alto) = C
    expect(
      calcularSegregacao({
        valorPagoCentavos: 10_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
        emAbertoCentavos: 5_000,
      }),
    ).toBe(1_000);
  });
  it("A vence quando o teto em aberto e o menor", () => {
    expect(
      calcularSegregacao({
        valorPagoCentavos: 10_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
        emAbertoCentavos: 300,
      }),
    ).toBe(300);
  });
  it("corrigido substitui o informado quando presente", () => {
    expect(
      calcularSegregacao({
        valorPagoCentavos: 10_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
        corrigidoCentavos: 700,
        emAbertoCentavos: 5_000,
      }),
    ).toBe(700);
  });
});

describe("calcularSegregacao (C3: A ausente cai do min)", () => {
  it("min de dois termos quando emAberto ausente", () => {
    expect(
      calcularSegregacao({
        valorPagoCentavos: 5_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
      }),
    ).toBe(500);
  });
  it("emAberto null tratado como ausente", () => {
    expect(
      calcularSegregacao({
        valorPagoCentavos: 10_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 1_000,
        emAbertoCentavos: null,
      }),
    ).toBe(1_000);
  });
});

describe("calcularSegregacao (C4: independencia por tributo)", () => {
  it("CBS e IBS calculados separadamente nao se compensam", () => {
    const cbs = calcularSegregacao({
      valorPagoCentavos: 5_000,
      valorOriginalCentavos: 10_000,
      informadoCentavos: 900, // 0.9% de 10.000,00? cenario 2026: CBS 0,9%
      emAbertoCentavos: 10_000,
    });
    const ibs = calcularSegregacao({
      valorPagoCentavos: 5_000,
      valorOriginalCentavos: 10_000,
      informadoCentavos: 100, // IBS 0,1%
      emAbertoCentavos: 10,
    });
    expect(cbs).toBe(450);
    expect(ibs).toBe(10); // capado pelo A do IBS; CBS intacto
  });
});

describe("calcularSegregacao (C5: validacao de entradas)", () => {
  it("aceita tributo zero (CBS+IBS zero e legal)", () => {
    expect(
      calcularSegregacao({
        valorPagoCentavos: 5_000,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 0,
      }),
    ).toBe(0);
  });
  it("rejeita valores negativos", () => {
    expect(() =>
      calcularSegregacao({
        valorPagoCentavos: -1,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 100,
      }),
    ).toThrow(/negativ/i);
  });
  it("rejeita Vt zero", () => {
    expect(() =>
      calcularSegregacao({
        valorPagoCentavos: 100,
        valorOriginalCentavos: 0,
        informadoCentavos: 100,
      }),
    ).toThrow(/original/i);
  });
  it("rejeita nao-inteiros (centavos sao inteiros)", () => {
    expect(() =>
      calcularSegregacao({
        valorPagoCentavos: 10.5,
        valorOriginalCentavos: 10_000,
        informadoCentavos: 100,
      }),
    ).toThrow(/inteiro/i);
  });
});

describe("calcularSegregacao (C6: sem contaminacao de float)", () => {
  it("bate com referencia BigInt em 500 casos aleatorios (inclui valores > 2^53 no produto)", () => {
    let seed = 424242;
    const rnd = () => {
      // LCG deterministico (sem Math.random: reproduzivel)
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed;
    };
    for (let i = 0; i < 500; i++) {
      const vt = (rnd() % 10_000_000_000) + 1; // ate 100 milhoes de reais
      const vp = rnd() % 10_000_000_000;
      const c = rnd() % 1_000_000_000;
      const a = i % 3 === 0 ? null : rnd() % 1_000_000_000;
      const got = calcularSegregacao({
        valorPagoCentavos: vp,
        valorOriginalCentavos: vt,
        informadoCentavos: c,
        emAbertoCentavos: a,
      });
      const proporcional = (BigInt(vp) * BigInt(c)) / BigInt(vt); // floor p/ positivos
      let ref = proporcional < BigInt(c) ? proporcional : BigInt(c);
      if (a !== null && BigInt(a) < ref) ref = BigInt(a);
      expect(BigInt(got)).toBe(ref);
    }
  });
});
