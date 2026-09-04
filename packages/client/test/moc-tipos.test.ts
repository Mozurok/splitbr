// Prova de tipo do Mecanismo de Ocorrencias.
//
// Os schemas MocOcorrenciaSol e MocOcorrenciaNot usam `allOf: [$ref, {required,
// not}]`, forma que o openapi-typescript 7.13.0 traduz errado: o discriminador
// vira o literal com o NOME do schema e o `not` vira Record<string, never>, que
// zera o resto. O codegen reescreve os dois tipos por isso.
//
// Estes testes existem para a reescrita nao poder quebrar em silencio. Sem
// eles, um tipo inconstruivel passa despercebido: nenhum outro codigo do
// pacote toca o MOC, entao `tsc` sai 0 e a suite fica verde com as duas rotas
// POST inutilizaveis. O corpo abaixo e o exemplo `boleto-sol` do proprio spec.
import { describe, expect, it } from "vitest";
import type { components } from "../src/generated/platform.js";

type Sol = components["schemas"]["MocOcorrenciaSol"];
type Not = components["schemas"]["MocOcorrenciaNot"];

describe("tipos do MOC sobrevivem ao codegen", () => {
  it("uma solicitacao de estorno de boleto e construivel", () => {
    const solicitacao: Sol = {
      index: 1,
      idOcor: "SOL12345678BOL202606230000001",
      arrj: "BOL",
      vlPago: 10.02,
      vlCbsSegr: 5.01,
      vlIbsSegr: 5.01,
      dtHrPgto: "2026-03-22T11:30:00-03:00",
      dtHrLiq: "2026-03-22T11:31:00-03:00",
      cnpjCpfPagEfet: "11444777000142",
      cnpjRaizPspPag: "12345678",
      cnpjRaizPspRecDir: "87654321",
      cnpjRec: "11444777000142",
      cnpjCpfDest: "11444777000142",
      idDda: "123A512312312312FAS1",
      codMotOcor: "02",
      vlCbsEst: 5.01,
      vlIbsEst: 5.01,
      descOcor: "Solicitação de estorno para boleto",
      cnpjPagOrig: "11444777000142",
    };

    // O discriminador tem que ser o valor do arranjo, nao o nome do schema.
    expect(solicitacao.arrj).toBe("BOL");
    expect(solicitacao.vlCbsEst).toBe(5.01);
  });

  it("uma notificacao de boleto e construivel sem os campos de estorno", () => {
    const notificacao: Not = {
      index: 1,
      idOcor: "NOT12345678BOL202606230000001",
      arrj: "BOL",
      vlPago: 10.02,
      vlCbsSegr: 5.01,
      vlIbsSegr: 5.01,
      dtHrPgto: "2026-03-22T11:30:00-03:00",
      dtHrLiq: "2026-03-22T11:31:00-03:00",
      cnpjRaizPspPag: "12345678",
      cnpjRaizPspRecDir: "87654321",
      cnpjRec: "11444777000142",
      cnpjCpfDest: "11444777000142",
      idDda: "123A512312312312FAS1",
      cnpjPagOrig: "11444777000142",
    };

    expect(notificacao.arrj).toBe("BOL");
  });

  it("o discriminador aceita os seis arranjos, nao o nome do schema", () => {
    const arranjos: Array<Sol["arrj"]> = ["BOL", "PXE", "PXD", "PXA", "TED", "TEF"];
    expect(arranjos).toHaveLength(6);
  });
});
