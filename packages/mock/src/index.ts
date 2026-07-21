export const VERSION = "0.1.0";
export { buildServer } from "./server.js";
export type { MockServer, MockServerOptions } from "./server.js";
export { sendProblem } from "./plugins/problem.js";
export type { ProblemInput } from "./plugins/problem.js";
export { MemoryStore } from "./store/memory.js";
export type { Transacao, StatusTransacao } from "./store/memory.js";
export { ChaosFlags } from "./chaos/flags.js";
export type { ChaosConfig, Variante401 } from "./chaos/flags.js";
export { dispararDivergencia } from "./scenario/engine.js";
export type { ComandoDivergencia, Procedimento } from "./scenario/engine.js";
export { codigoRsup } from "./scenario/rsup-codes.js";
export type { TipoDivergencia } from "./scenario/rsup-codes.js";
export {
  calcularPadraoCentavos,
  calcularSimplificadoCentavos,
  ALIQUOTA_TESTE_2026,
  PERCENTUAIS_SIMPLIFICADO_PLACEHOLDER,
} from "./domain/calculo.js";
export { carregarMatriz, validarContraMatriz } from "./domain/matrices.js";
export type { Arranjo, Matriz, Regra } from "./domain/matrices.js";
