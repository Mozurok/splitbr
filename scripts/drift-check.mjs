#!/usr/bin/env node
// Compara os contratos hospedados da familia Calculadora com as copias
// vendoradas, em conteudo NORMALIZADO (sem o bloco servers, chaves ordenadas):
// o springdoc carimba a porta da instancia em servers[].url, entao hash de
// bytes gera falso drift (licao registrada no P0). Sai !=0 somente em drift.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

const TARGETS = [
  {
    name: "calculadora regime-geral (portal)",
    vendored: "vendor/swagger/calculadora-openapi.portal.json",
    live: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs",
  },
  {
    name: "calculadora regime-geral (piloto)",
    vendored: "vendor/swagger/calculadora-openapi.piloto.json",
    live: "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs",
  },
  {
    name: "api-split simplificado (portal)",
    vendored: "vendor/swagger/api-split-openapi.portal.json",
    live: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api-split/api-docs",
  },
];

function normalize(value) {
  if (Array.isArray(value)) return value.map(normalize);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) {
      if (key === "servers") continue;
      out[key] = normalize(value[key]);
    }
    return out;
  }
  return value;
}

const canonical = (obj) => JSON.stringify(normalize(obj));

let drift = 0;
for (const t of TARGETS) {
  const vendored = canonical(JSON.parse(readFileSync(resolve(root, t.vendored), "utf8")));
  let liveRaw;
  try {
    const res = await fetch(t.live, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    liveRaw = await res.json();
  } catch (err) {
    console.log(`UNREACHABLE  ${t.name}: ${err.message} (skip gracioso; ambiente de teste)`);
    continue;
  }
  if (canonical(liveRaw) === vendored) {
    console.log(`MATCH        ${t.name}`);
  } else {
    console.log(`DRIFT        ${t.name}: contrato ao vivo difere do vendorado; re-vendorar via task`);
    drift += 1;
  }
}
process.exit(drift > 0 ? 1 : 0);
