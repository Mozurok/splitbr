// Prova de tipo das tres mudancas do contrato v1.1.1 que quebram quem consome
// os tipos (vendor/MANIFEST.md, nota de 2026-10-22).
//
// Sao todas remocoes, e remocao e o tipo de mudanca que um regenerado errado
// esconde melhor: se o codegen voltasse a ler o v1.1.0, tsc continuaria saindo
// 0 e a suite continuaria verde, porque nenhum outro codigo do pacote monta
// esses corpos. Estes testes falham na compilacao se algum campo voltar.
import { describe, expect, it } from "vitest";
import type { components } from "../src/generated/platform.js";

type Schemas = components["schemas"];
type Respostas = components["responses"];
type Tem<T, K extends string> = K extends keyof T ? true : false;
// Restrito as respostas que de fato tem corpo problem+json: com uma chave
// qualquer, um nome errado viraria `never` e as assercoes de ausencia passariam
// por vacuidade.
type RespostaProblema = {
  [K in keyof Respostas]: Respostas[K]["content"] extends { "application/problem+json": unknown }
    ? K
    : never;
}[keyof Respostas];
type CorpoDoProblema<R extends RespostaProblema> =
  Respostas[R]["content"] extends { "application/problem+json": infer C } ? C : never;

describe("contrato v1.1.1", () => {
  it("indPgtoIntegral saiu de Pix Dinamico e Pix Automatico e ficou so no Boleto", () => {
    const pix: [
      Tem<Schemas["InformePreliminarDePagamentoPixDinamicoTransacao"], "indPgtoIntegral">,
      Tem<Schemas["InformePreliminarDePagamentoPixAutomaticoTransacao"], "indPgtoIntegral">,
      Tem<Schemas["InformeDeSegregacaoPixDinamicoTransacao"], "indPgtoIntegral">,
      Tem<Schemas["InformeDeSegregacaoPixAutomaticoTransacao"], "indPgtoIntegral">,
    ] = [false, false, false, false];
    const boleto: Tem<Schemas["InformePreliminarDePagamentoBoletoTransacao"], "indPgtoIntegral"> =
      true;

    expect(pix).toEqual([false, false, false, false]);
    expect(boleto).toBe(true);
  });

  it("cnpjRaizPspRecInd saiu do Boleto e continua nos arranjos Pix", () => {
    const boleto: [
      Tem<Schemas["InformeDeTransacaoIniciadaBoletoTransacao"], "cnpjRaizPspRecInd">,
      Tem<Schemas["InformeDeTransacaoAtualizadaBoletoTransacao"], "cnpjRaizPspRecInd">,
      Tem<Schemas["InformeDeBaixaExcetoPorPagamentoBoletoTransacao"], "cnpjRaizPspRecInd">,
      Tem<Schemas["InformePreliminarDePagamentoBoletoTransacao"], "cnpjRaizPspRecInd">,
      Tem<Schemas["InformeDeSegregacaoBoletoTransacao"], "cnpjRaizPspRecInd">,
      Tem<Schemas["RetornoSuperInteligenteBoletoTransacao"], "cnpjRaizPspRecInd">,
    ] = [false, false, false, false, false, false];
    const pix: Tem<Schemas["InformePreliminarDePagamentoPixDinamicoTransacao"], "cnpjRaizPspRecInd"> =
      true;

    expect(boleto.every((t) => t === false)).toBe(true);
    expect(pix).toBe(true);
  });

  it("respostas de erro trocaram errors por resourceId", () => {
    const semErrors: [
      Tem<CorpoDoProblema<"PPResponseForbidden">, "errors">,
      Tem<CorpoDoProblema<"PPResponseError">, "errors">,
      Tem<CorpoDoProblema<"PPResponseGoneStream">, "errors">,
      Tem<CorpoDoProblema<"PPResponseUnprocessableEntitySegregacaoLote">, "errors">,
    ] = [false, false, false, false];
    const comResourceId: [
      Tem<CorpoDoProblema<"PPResponseForbidden">, "resourceId">,
      Tem<CorpoDoProblema<"PPResponseBadRequest">, "resourceId">,
      Tem<CorpoDoProblema<"PPResponseError">, "resourceId">,
    ] = [true, true, true];

    expect(semErrors).toEqual([false, false, false, false]);
    expect(comResourceId).toEqual([true, true, true]);
  });
});
