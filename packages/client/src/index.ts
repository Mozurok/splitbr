export const VERSION = "0.1.0";
export { calcularSegregacao } from "./domain/segregacao.js";
export type { SegregacaoInput } from "./domain/segregacao.js";
export type { CategoriaValor, PapelPsp, Tributo } from "./domain/types.js";
export {
  gerarCorrelationId,
  gerarTimestampSplit,
  splitHeadersMiddleware,
} from "./headers.js";
export type { SplitHeadersOptions } from "./headers.js";
export { toProblem } from "./problem.js";
export type { ProblemDetail } from "./problem.js";
export { createSplitClient } from "./client.js";
export type { SplitClientOptions } from "./client.js";
export type { paths } from "./generated/platform.js";
