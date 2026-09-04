import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./generated/platform.js";
import { assinaturaMiddleware } from "./headers.js";
import type { AssinadorRs256 } from "./assinatura.js";

export interface SplitClientOptions {
  /** Base URL da plataforma (ambiente do PSP). */
  baseUrl: string;
  /** Identificador da chave de assinatura; vai no `kid` do protected header. */
  kid: string;
  /**
   * A operação RS256 sobre os bytes que o client monta.
   *
   * Recebe a entrada de assinatura já pronta (protected header mais o payload
   * canonicalizado) e devolve a assinatura crua. A chave privada fica com você:
   * este pacote nunca a vê, e o callback é o ponto natural para um HSM, um KMS
   * ou o `node:crypto`.
   */
  assinar: AssinadorRs256;
  /** fetch customizado (testes, instrumentação). */
  fetch?: typeof globalThis.fetch;
  /** Relógio do `iat`, em segundos epoch. Injetável para teste. */
  agora?: () => number;
  /** Gerador do `jti`. Injetável para teste. */
  gerarJti?: () => string;
}

/**
 * Client tipado da Plataforma Pública do Split Payment, gerado do OpenAPI
 * v1.1.0, com a assinatura `X-JWS-Signature` aplicada a cada requisição.
 */
export function createSplitClient(options: SplitClientOptions): Client<paths> {
  const { baseUrl, fetch: customFetch, ...assinatura } = options;
  const client = createClient<paths>(customFetch ? { baseUrl, fetch: customFetch } : { baseUrl });
  client.use(assinaturaMiddleware(assinatura));
  return client;
}
