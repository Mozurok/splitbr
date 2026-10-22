import type { FastifyError, FastifyInstance, FastifyReply } from "fastify";
import type { MemoryStore } from "../store/memory.js";

/**
 * RFC 7807 application/problem+json, taxonomia do Manual de Integracao
 * (400 schema + X-Error-Type: permanent, 401 cert/token, 403 nao homologado,
 * 404, 422 negocio + X-Error-Type: business, 429 + Retry-After, 500 +
 * X-Retry-Allowed: true, 503 + X-Circuit-Breaker/X-Retry-Allowed, 504 + Retry-After).
 */
export interface ProblemInput {
  status: number;
  title: string;
  detail?: string;
  type?: string;
  /** Campos de extensao preservados no corpo (RFC 7807 secao 3.2). */
  extensions?: Record<string, unknown>;
  /** Headers extras (Retry-After, X-Circuit-Breaker, X-Retry-Allowed...). */
  headers?: Record<string, string>;
}

/**
 * `resourceId` em toda resposta de erro do contrato. O v1.1.1 pos o campo em
 * todos os schemas problem+json, e o capitulo 9 do manual diz que cada
 * requisicao processada gera um, com sucesso ou com erro. So vale para /api/:
 * as rotas utilitarias (/_scenario, /healthz) nao sao contrato e nao devem
 * consumir o contador, que e deterministico por seed.
 */
function resourceIdDoErro(reply: FastifyReply, p: ProblemInput): string | undefined {
  if (typeof p.extensions?.["resourceId"] === "string") return undefined;
  if (!reply.request.url.startsWith("/api/")) return undefined;
  const { store } = reply.server as Partial<{ store: MemoryStore }>;
  return store?.proximoResourceId();
}

export function sendProblem(reply: FastifyReply, p: ProblemInput): FastifyReply {
  const resourceId = resourceIdDoErro(reply, p);
  if (p.headers) {
    for (const [k, v] of Object.entries(p.headers)) reply.header(k, v);
  }
  // Classificador maquina-legivel da taxonomia: 400 permanente, 422 negocio.
  if ((p.status === 400 || p.status === 422) && !p.headers?.["X-Error-Type"]) {
    reply.header("X-Error-Type", p.status === 400 ? "permanent" : "business");
  }
  return reply
    .status(p.status)
    .type("application/problem+json")
    .send({
      type: p.type ?? "about:blank",
      title: p.title,
      status: p.status,
      ...(p.detail !== undefined ? { detail: p.detail } : {}),
      ...(resourceId !== undefined ? { resourceId } : {}),
      ...p.extensions,
    });
}

export function problemPlugin(app: FastifyInstance): void {
  app.setNotFoundHandler((request, reply) => {
    sendProblem(reply, {
      status: 404,
      title: "Recurso nao encontrado",
      detail: `Rota ${request.method} ${request.url} inexistente na plataforma`,
    });
  });

  app.setErrorHandler((error: FastifyError, _request, reply) => {
    const status =
      typeof error.statusCode === "number" && error.statusCode >= 400
        ? error.statusCode
        : 500;
    sendProblem(reply, {
      status,
      title: status === 500 ? "Erro interno" : error.message,
      ...(status === 500 ? { headers: { "X-Retry-Allowed": "true" } } : { detail: error.message }),
    });
  });
}
