#!/usr/bin/env node
// Compara os contratos hospedados da familia Calculadora com as copias
// vendoradas, em conteudo NORMALIZADO (sem o bloco servers da raiz, chaves
// ordenadas): o springdoc carimba a porta da instancia em servers[].url, entao
// hash de bytes gera falso drift (licao registrada no P0).
//
// A severidade e por alvo (D-2, D-3): portal e api-split reprovam o run tanto
// em drift quanto em indisponibilidade; o piloto e infraestrutura de teste ate
// 31/12/2026, entao sinaliza sem reprovar. Falha de leitura do arquivo
// vendorado e "setup-error": problema nosso, nao drift, e reprova sempre.
//
// Cobertura: os tres alvos abaixo NAO alimentam o codegen. O spec que gera
// @splitbr/client e @splitbr/mock e vendor/swagger/openapi-v0_0_10.json, que
// nao tem endpoint publico (as URLs candidatas redirecionam para /login/ e o
// acesso a plataforma e PSP-only), entao nao ha como monitora-lo aqui. A
// integridade local dele e garantida pelo hash pinado em
// packages/client/scripts/codegen.mjs. Gap declarado por D-4.
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");

export const TARGETS = [
  {
    name: "calculadora regime-geral (portal)",
    vendored: "vendor/swagger/calculadora-openapi.portal.json",
    live: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs",
    severity: "fail",
  },
  {
    name: "calculadora regime-geral (piloto)",
    vendored: "vendor/swagger/calculadora-openapi.piloto.json",
    live: "https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs",
    severity: "warn",
  },
  {
    name: "api-split simplificado (portal)",
    vendored: "vendor/swagger/api-split-openapi.portal.json",
    live: "https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api-split/api-docs",
    severity: "fail",
  },
];

function sortDeep(value) {
  if (Array.isArray(value)) return value.map(sortDeep);
  if (value && typeof value === "object") {
    const out = {};
    for (const key of Object.keys(value).sort()) out[key] = sortDeep(value[key]);
    return out;
  }
  return value;
}

// Só o servers da RAIZ sai da comparacao: e ali que o springdoc carimba a porta
// da instancia. Um campo chamado "servers" dentro de um schema e conteudo de
// contrato e continua sendo comparado.
export function normalize(doc) {
  if (!doc || typeof doc !== "object" || Array.isArray(doc)) return sortDeep(doc);
  const { servers: _instanciaQueRespondeu, ...semServersNaRaiz } = doc;
  return sortDeep(semServersNaRaiz);
}

const canonical = (doc) => JSON.stringify(normalize(doc));

// Caminhos das chaves que diferem, para o relatorio dizer o que mudou em vez de
// so dizer que mudou. Limitado para nao despejar um spec inteiro no log.
export function diffSummary(vendored, live, limit = 12) {
  const changed = [];
  const walk = (a, b, path) => {
    if (changed.length >= limit) return;
    const ambosObjetos =
      a && b && typeof a === "object" && typeof b === "object" &&
      Array.isArray(a) === Array.isArray(b);
    if (!ambosObjetos) {
      if (JSON.stringify(a) !== JSON.stringify(b)) changed.push(path);
      return;
    }
    for (const key of [...new Set([...Object.keys(a), ...Object.keys(b)])].sort()) {
      if (changed.length >= limit) return;
      const next = Array.isArray(a) ? `${path}[${key}]` : `${path}.${key}`;
      if (!(key in a)) changed.push(`${next} (só no vivo)`);
      else if (!(key in b)) changed.push(`${next} (só no vendorado)`);
      else walk(a[key], b[key], next);
    }
  };
  walk(normalize(vendored), normalize(live), "$");
  return changed;
}

export function verdictFor(target, vendoredDoc, liveResult) {
  const base = { name: target.name, severity: target.severity, changed: [] };
  if (vendoredDoc === null || vendoredDoc === undefined) {
    return { ...base, status: "setup-error", detail: "arquivo vendorado ausente ou ilegível" };
  }
  if (!liveResult || !liveResult.ok) {
    const status = liveResult?.kind === "parse" ? "malformed" : "unreachable";
    return { ...base, status, detail: liveResult?.error ?? "sem resposta" };
  }
  if (canonical(vendoredDoc) === canonical(liveResult.doc)) return { ...base, status: "match" };
  return { ...base, status: "drift", changed: diffSummary(vendoredDoc, liveResult.doc) };
}

// Um alvo esta DIVERGENTE quando o contrato mudou, quando nao deu pra ler o
// contrato, ou quando o corpo veio quebrado. A severidade decide se isso
// reprova o run; nao decide se alguem fica sabendo (D-2, D-3).
const DIVERGENTE = new Set(["drift", "unreachable", "malformed"]);

// setup-error e problema nosso e reprova em qualquer alvo.
export function exitCodeFor(verdicts) {
  if (verdicts.some((v) => v.status === "setup-error")) return 2;
  const reprova = verdicts.some((v) => v.severity === "fail" && DIVERGENTE.has(v.status));
  return reprova ? 1 : 0;
}

// "informational" existe porque D-2 manda RELATAR a divergencia do piloto sem
// reprovar o run, e relatar num log que ninguem abre num check verde e o mesmo
// que nao relatar: o piloto e justamente o canal de antecipacao de mudanca
// (vendor/MANIFEST.md), entao engolir a divergencia dele mata o valor dele.
export function overallStatus(verdicts) {
  if (verdicts.some((v) => v.status === "setup-error")) return "setup-error";
  const divergentes = verdicts.filter((v) => DIVERGENTE.has(v.status));
  const reprovando = divergentes.filter((v) => v.severity === "fail");
  if (reprovando.some((v) => v.status === "drift")) return "drift";
  if (reprovando.some((v) => v.status === "malformed")) return "malformed";
  if (reprovando.length > 0) return "unreachable";
  return divergentes.length > 0 ? "informational" : "ok";
}

export function report(verdicts, log = console.log) {
  for (const v of verdicts) {
    if (v.status === "match") {
      log(`MATCH         ${v.name}`);
    } else if (v.status === "setup-error") {
      log(`SETUP-ERROR   ${v.name}: ${v.detail}`);
    } else if (v.status === "unreachable" || v.status === "malformed") {
      const aviso = v.severity === "fail" ? "" : " (alvo informativo, não reprova)";
      const rotulo = v.status === "malformed" ? "MALFORMED  " : "UNREACHABLE";
      log(`${rotulo}   ${v.name}: ${v.detail}${aviso}`);
    } else {
      const aviso = v.severity === "fail" ? "" : " (alvo informativo, não reprova)";
      log(`DRIFT         ${v.name}: contrato ao vivo difere do vendorado${aviso}`);
      for (const caminho of v.changed) log(`                 ${caminho}`);
    }
  }
}

export function readVendored(target) {
  try {
    return JSON.parse(readFileSync(resolve(root, target.vendored), "utf8"));
  } catch {
    return null;
  }
}

// `kind` separa "nao consegui falar com o host" de "falei, respondeu 200, mas o
// corpo nao e JSON". Sao problemas diferentes: um manda olhar a rede, o outro
// manda olhar o contrato.
export async function fetchLive(target, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(target.live, { signal: AbortSignal.timeout(30_000) });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
  } catch (err) {
    return { ok: false, kind: "fetch", error: err.message };
  }
  try {
    return { ok: true, doc: await res.json() };
  } catch (err) {
    return { ok: false, kind: "parse", error: `resposta 200 nao e JSON valido: ${err.message}` };
  }
}

const isMain =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);

if (isMain) {
  const verdicts = [];
  for (const target of TARGETS) {
    verdicts.push(verdictFor(target, readVendored(target), await fetchLive(target)));
  }
  report(verdicts);

  // O workflow decide pelo status, nao pelo exit code: assim um setup-error nao
  // abre issue rotulada como drift (gap 3).
  if (process.env.GITHUB_OUTPUT) {
    const { appendFileSync } = await import("node:fs");
    appendFileSync(process.env.GITHUB_OUTPUT, `status=${overallStatus(verdicts)}\n`);
  }
  process.exit(exitCodeFor(verdicts));
}
