import createClient, { type Client } from "openapi-fetch";
import type { paths } from "./generated/platform.js";
import { splitHeadersMiddleware, type SplitHeadersOptions } from "./headers.js";

export interface SplitClientOptions extends SplitHeadersOptions {
  /** Base URL da plataforma (ambiente do PSP). */
  baseUrl: string;
  /** fetch customizado (testes, instrumentacao). */
  fetch?: typeof globalThis.fetch;
}

/**
 * Client tipado da Plataforma Publica do Split Payment: openapi-fetch sobre os
 * tipos gerados do spec vendorado, com os 4 headers obrigatorios injetados.
 */
export function createSplitClient(options: SplitClientOptions): Client<paths> {
  const { baseUrl, fetch: customFetch, ...headerOpts } = options;
  const client = createClient<paths>(
    customFetch ? { baseUrl, fetch: customFetch } : { baseUrl },
  );
  client.use(splitHeadersMiddleware(headerOpts));
  return client;
}
