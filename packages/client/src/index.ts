export const VERSION = "0.2.0";
export { calcularSegregacao } from "./domain/segregacao.js";
export type { SegregacaoInput } from "./domain/segregacao.js";
export type { CategoriaValor, PapelPsp, Tributo } from "./domain/types.js";
export { assinaturaMiddleware, gerarTimestampSplit } from "./headers.js";
export {
  ErroDeAssinatura,
  assinarRequisicao,
  base64url,
  conferirFormaDoHeader,
  montarEntradaDeAssinatura,
  montarProtectedHeader,
} from "./assinatura.js";
export type {
  AssinadorRs256,
  OpcoesDeAssinatura,
  ProtectedHeader,
  ResultadoDaAssinatura,
} from "./assinatura.js";
export { ErroDeCanonicalizacao, canonicalizarJcs, canonicalizarJcsBytes } from "./jcs.js";
export { toProblem } from "./problem.js";
export type { ProblemDetail } from "./problem.js";
export { createSplitClient } from "./client.js";
export type { SplitClientOptions } from "./client.js";
export type { paths } from "./generated/platform.js";
