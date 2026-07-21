#!/usr/bin/env node
// CLI do @splitbr/mock: sobe o mock local da Plataforma Publica de Split
// Payment. Flags: --port, --host, --seed, --stream-timeout (ms),
// --resource-id-consulta, --verbose.
import { buildServer } from "../dist/index.mjs";

function argValor(nome, padrao) {
  const i = process.argv.indexOf(`--${nome}`);
  if (i === -1 || i + 1 >= process.argv.length) return padrao;
  return process.argv[i + 1];
}

const port = Number(argValor("port", "8377"));
const host = argValor("host", "127.0.0.1");
const seed = Number(argValor("seed", "1"));
const streamTimeoutMs = Number(argValor("stream-timeout", "25000"));
const resourceIdConsulta = process.argv.includes("--resource-id-consulta");
const logger = process.argv.includes("--verbose");

const app = buildServer({ seed, streamTimeoutMs, resourceIdConsulta, logger });

app
  .listen({ port, host })
  .then((endereco) => {
    console.log(`@splitbr/mock no ar em ${endereco} (seed ${seed})`);
    console.log("Rotas utilitarias: GET /healthz | POST/DELETE /_chaos | POST /_scenario/divergencia");
  })
  .catch((erro) => {
    console.error("Falha ao subir o mock:", erro.message);
    process.exit(1);
  });
