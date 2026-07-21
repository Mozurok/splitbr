import Fastify, { type FastifyInstance } from "fastify";
import { ChaosFlags, chaosPlugin } from "./chaos/flags.js";
import { headersPlugin } from "./plugins/headers.js";
import { problemPlugin } from "./plugins/problem.js";
import { registrarRotasCenario } from "./scenario/engine.js";
import { registrarRotasPreliminar } from "./routes/informe-preliminar.js";
import { registrarRotasSegregacao } from "./routes/segregacao.js";
import { registrarRotasStream } from "./routes/stream.js";
import { registrarRotasTransacao } from "./routes/transacao.js";
import { carregarSpec } from "./spec/load.js";
import { MemoryStore } from "./store/memory.js";

export interface MockServerOptions {
  /** Seed dos cenarios deterministicos (D-3); default 1. */
  seed?: number;
  logger?: boolean;
  /** Caminho alternativo do spec (testes); default: copia embarcada pinada. */
  specPath?: string;
  /** Janela do long polling em ms; default 25000 (o manual nao fixa valor). */
  streamTimeoutMs?: number;
  /**
   * Liga o stub da consulta por ResourceId (flag; o endpoint sera especificado
   * em versoes futuras do manual -- brief, secao 11). Default: desligado.
   */
  resourceIdConsulta?: boolean;
}

export interface MockServer extends FastifyInstance {
  store: MemoryStore;
  chaos: ChaosFlags;
}

export function buildServer(options: MockServerOptions = {}): MockServer {
  const app = Fastify({
    logger: options.logger ?? false,
    ajv: {
      customOptions: {
        // OAS 3.1 usa o draft 2020-12; strict desligado para aceitar as
        // keywords do spec oficial sem retrabalho (D-2).
        strict: false,
        allErrors: false,
      },
    },
  }) as unknown as MockServer;

  // A trava de hash roda no boot: spec adulterado nunca sobe (D-2, C2).
  const registro = carregarSpec(options.specPath);
  const store = new MemoryStore(options.seed ?? 1);
  const chaos = new ChaosFlags();
  app.store = store;
  app.chaos = chaos;

  problemPlugin(app);
  // Chaos antes dos headers: na plataforma real, auth (401/403) e protecoes
  // de borda (429/503) precedem a validacao de payload.
  chaosPlugin(app, chaos);
  headersPlugin(app);

  registrarRotasTransacao(app, { store, registro });
  registrarRotasPreliminar(app, { store, registro });
  registrarRotasSegregacao(app, { store, registro });
  registrarRotasStream(app, { store, registro }, { timeoutMs: options.streamTimeoutMs ?? 25_000 });
  registrarRotasCenario(app, store);

  if (options.resourceIdConsulta) {
    // Stub atras de flag: o ResourceId "possibilita consultar o recurso
    // incluido; a consulta sera especificada nas proximas versoes do manual".
    app.get("/api/v1/consulta/resource/:resourceId", async (request, reply) => {
      return reply
        .status(501)
        .type("application/problem+json")
        .send({
          type: "about:blank",
          title: "Consulta por ResourceId ainda nao especificada",
          status: 501,
          detail:
            "O manual v1.0 anuncia a consulta por ResourceId para versoes futuras; este stub existe para reservar o fluxo no mock",
          resourceId: (request.params as { resourceId: string }).resourceId,
        });
    });
  }

  app.get("/healthz", async () => ({ status: "ok", seed: store.seed }));

  return app;
}
