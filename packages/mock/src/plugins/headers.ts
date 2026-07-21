import type { FastifyInstance } from "fastify";
import { sendProblem } from "./problem.js";

/**
 * Enforca os 4 headers obrigatorios da tabela do Manual de Integracao em toda
 * rota /api/*. Rotas utilitarias (ex.: /healthz) ficam isentas.
 */
const MESSAGE_ID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const TENANT_ID = /^[A-Za-z0-9]{14}$/;
const TIMESTAMP = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-03:00$/;

interface HeaderRule {
  name: string;
  check: (value: string) => boolean;
  expected: string;
}

const RULES: HeaderRule[] = [
  {
    name: "messageId",
    check: (v) => MESSAGE_ID.test(v),
    expected: "UUID v4 minusculo (36 posicoes), unico por requisicao",
  },
  {
    name: "correlationId",
    check: (v) => v.length === 19,
    expected: "string de exatamente 19 posicoes, propagada na jornada",
  },
  {
    name: "tenantId",
    check: (v) => TENANT_ID.test(v),
    expected: "CNPJ alfanumerico do PSP (14 posicoes)",
  },
  {
    name: "timestamp",
    check: (v) => TIMESTAMP.test(v),
    expected: "ISO 8601 com offset -03:00, sem milissegundos (25 posicoes)",
  },
];

export function headersPlugin(app: FastifyInstance): void {
  app.addHook("onRequest", (request, reply, done) => {
    if (!request.url.startsWith("/api/")) {
      done();
      return;
    }
    for (const rule of RULES) {
      const raw = request.headers[rule.name.toLowerCase()];
      const value = Array.isArray(raw) ? raw[0] : raw;
      if (value === undefined || value === "" || !rule.check(value)) {
        sendProblem(reply, {
          status: 400,
          title: "Header obrigatorio ausente ou invalido",
          detail: `Header '${rule.name}' ${value === undefined || value === "" ? "ausente" : "invalido"}; esperado: ${rule.expected}`,
          extensions: { header: rule.name },
        });
        done();
        return;
      }
    }
    const correlation = request.headers["correlationid"];
    reply.header(
      "correlationId",
      Array.isArray(correlation) ? correlation[0] : (correlation as string),
    );
    done();
  });
}
