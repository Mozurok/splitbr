import type { FastifyInstance } from "fastify";
import { sendProblem } from "../plugins/problem.js";

/**
 * Chaos flags da taxonomia de erros do Manual e da simulacao de auth (D-4).
 * As TRES variantes de 503 do manual existem separadas: instabilidade
 * transitoria (Retry-After + X-Retry-Allowed: true), circuit breaker
 * (X-Circuit-Breaker: open + X-Retry-Allowed + Retry-After) e manutencao/
 * janela programada (so Retry-After). 500 leva X-Retry-Allowed: true e 504
 * leva Retry-After. Armadas via POST /_chaos, limpas via DELETE /_chaos;
 * atingem apenas /api/*.
 */
export type Variante401 = "cert-expirado" | "cert-invalido" | "token-invalido";

export interface ChaosConfig {
  rate429?: { retryAfterSeconds: number };
  /** 503 variante circuit breaker (fila interna degradada/indisponivel). */
  circuito503?: { retryAfterSeconds: number; retryAllowed: boolean };
  /** 503 variante instabilidade transitoria (congestionamento, timeout). */
  indisponivel503?: { retryAfterSeconds: number };
  /** 503 variante manutencao ou janela programada. */
  manutencao503?: { retryAfterSeconds: number };
  erro500?: boolean;
  timeout504?: { retryAfterSeconds: number } | boolean;
  auth401?: { variante: Variante401 };
  forbidden403?: boolean;
}

export class ChaosFlags {
  config: ChaosConfig = {};

  armar(config: ChaosConfig): void {
    this.config = { ...this.config, ...config };
  }

  limpar(): void {
    this.config = {};
  }
}

const DETALHE_401: Record<Variante401, string> = {
  "cert-expirado": "Certificado digital expirado",
  "cert-invalido": "Falha na validacao do certificado digital",
  "token-invalido": "Token de acesso invalido",
};

export function chaosPlugin(app: FastifyInstance, flags: ChaosFlags): void {
  app.addHook("onRequest", (request, reply, done) => {
    if (!request.url.startsWith("/api/")) {
      done();
      return;
    }
    const c = flags.config;
    if (c.auth401) {
      sendProblem(reply, {
        status: 401,
        title: "Nao autorizado",
        detail: DETALHE_401[c.auth401.variante],
        extensions: { variante: c.auth401.variante },
      });
    } else if (c.forbidden403) {
      sendProblem(reply, {
        status: 403,
        title: "PSP nao homologado",
        detail: "O PSP informado nao esta homologado para a Plataforma Publica",
      });
    } else if (c.rate429) {
      sendProblem(reply, {
        status: 429,
        title: "Limite de requisicoes excedido",
        detail: "Aguarde o intervalo indicado em Retry-After antes de reenviar",
        headers: { "Retry-After": String(c.rate429.retryAfterSeconds) },
      });
    } else if (c.circuito503) {
      sendProblem(reply, {
        status: 503,
        title: "Servico indisponivel",
        detail: "Circuit breaker aberto na Plataforma Publica",
        headers: {
          "Retry-After": String(c.circuito503.retryAfterSeconds),
          "X-Circuit-Breaker": "open",
          "X-Retry-Allowed": c.circuito503.retryAllowed ? "true" : "false",
        },
      });
    } else if (c.indisponivel503) {
      sendProblem(reply, {
        status: 503,
        title: "Servico indisponivel",
        detail: "Instabilidade temporaria (congestionamento); retente apos o intervalo",
        headers: {
          "Retry-After": String(c.indisponivel503.retryAfterSeconds),
          "X-Retry-Allowed": "true",
        },
      });
    } else if (c.manutencao503) {
      sendProblem(reply, {
        status: 503,
        title: "Manutencao ou janela programada",
        detail: "Plataforma indisponivel por manutencao; retente apos o horario informado",
        headers: { "Retry-After": String(c.manutencao503.retryAfterSeconds) },
      });
    } else if (c.erro500) {
      sendProblem(reply, {
        status: 500,
        title: "Erro interno",
        detail: "Erro interno simulado; retente de forma limitada",
        headers: { "X-Retry-Allowed": "true" },
      });
    } else if (c.timeout504) {
      const segundos = typeof c.timeout504 === "object" ? c.timeout504.retryAfterSeconds : 30;
      sendProblem(reply, {
        status: 504,
        title: "Gateway timeout",
        detail: "Timeout de dependencia externa; aplique backoff exponencial",
        headers: { "Retry-After": String(segundos) },
      });
    } else {
      done();
      return;
    }
    done();
  });

  app.post("/_chaos", async (request, reply) => {
    flags.armar((request.body ?? {}) as ChaosConfig);
    return reply.status(200).send({ status: "armado", config: flags.config });
  });

  app.delete("/_chaos", async (_request, reply) => {
    flags.limpar();
    return reply.status(200).send({ status: "limpo" });
  });
}
