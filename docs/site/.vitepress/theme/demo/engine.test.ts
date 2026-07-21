import { describe, expect, it } from "vitest";
import { calcularSegregacao } from "@splitbr/client";
import { calcularSplit, formatarBRL } from "./engine.js";
import { cicloFeliz } from "./dados.js";

/**
 * C1 (TEST_STRATEGY): a demo-como-validacao. Os numeros do caso 1 sao os da
 * calcularSegregacao publicada, nao uma reimplementacao. Cases 2/3 (C2/C3) e a
 * flag de honestidade (E1) chegam na Slice 6.
 */
describe("engine (caso 1: ciclo feliz)", () => {
  const r = calcularSplit(cicloFeliz.segregacao);

  it("computa os valores reais do tutorial (R$ 10 ao fisco, R$ 990 liquido)", () => {
    expect(r.cbsCentavos).toBe(900);
    expect(r.ibsCentavos).toBe(100);
    expect(r.foiParaFiscoCentavos).toBe(1000);
    expect(r.sobrouParaEmpresaCentavos).toBe(99_000);
  });

  it("delega a calcularSegregacao publicada (nao reimplementa a matematica)", () => {
    const base = {
      valorPagoCentavos: cicloFeliz.segregacao.valorPagoCentavos,
      valorOriginalCentavos: cicloFeliz.segregacao.valorNotaCentavos,
    };
    expect(r.cbsCentavos).toBe(
      calcularSegregacao({ ...base, informadoCentavos: 900 }),
    );
    expect(r.ibsCentavos).toBe(
      calcularSegregacao({ ...base, informadoCentavos: 100 }),
    );
  });

  it("formata centavos em BRL sem erro de ponto flutuante", () => {
    expect(formatarBRL(99_000)).toBe("R$ 990,00");
    expect(formatarBRL(1000)).toBe("R$ 10,00");
    expect(formatarBRL(100_000)).toBe("R$ 1.000,00");
  });
});
