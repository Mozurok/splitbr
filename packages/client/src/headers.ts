import type { Middleware } from "openapi-fetch";

export interface SplitHeadersOptions {
  /** CNPJ (alfanumerico, 14 posicoes) do PSP; vira o header tenantId. */
  tenantId: string;
  /** correlationId fixo (19 posicoes) a propagar; ausente = gerado por requisicao. */
  correlationId?: string;
}

const TENANT_ID = /^[A-Za-z0-9]{14}$/;

/**
 * Timestamp exigido pela plataforma: ISO 8601 em horario de Brasilia com
 * offset literal -03:00, 25 posicoes, sem milissegundos (tabela de headers do
 * Manual de Integracao; exemplo: 2025-12-22T14:30:45-03:00).
 */
export function gerarTimestampSplit(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() - 3 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
    `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}-03:00`
  );
}

/** String unica de 19 posicoes no espirito do exemplo do manual (txn-...). */
export function gerarCorrelationId(): string {
  const alnum = crypto.randomUUID().replaceAll("-", "");
  return `txn-${Date.now().toString(36)}${alnum}`.slice(0, 19);
}

/**
 * Middleware openapi-fetch que injeta os 4 headers obrigatorios da plataforma:
 * messageId (UUID v4, unico por requisicao), correlationId (19 posicoes,
 * propagado verbatim quando fornecido), tenantId (CNPJ alfanumerico) e
 * timestamp (-03:00).
 */
export function splitHeadersMiddleware(opts: SplitHeadersOptions): Middleware {
  if (!TENANT_ID.test(opts.tenantId)) {
    throw new RangeError(
      "tenantId deve ter exatamente 14 posicoes alfanumericas (CNPJ, incluindo o formato alfanumerico da IN RFB 2.229/2024)",
    );
  }
  if (opts.correlationId !== undefined && opts.correlationId.length !== 19) {
    throw new RangeError("correlationId deve ter exatamente 19 posicoes");
  }
  return {
    onRequest({ request }) {
      request.headers.set("messageId", crypto.randomUUID());
      request.headers.set("correlationId", opts.correlationId ?? gerarCorrelationId());
      request.headers.set("tenantId", opts.tenantId);
      request.headers.set("timestamp", gerarTimestampSplit());
      return request;
    },
  };
}
