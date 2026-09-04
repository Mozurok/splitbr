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
// Cobertura: os tres primeiros alvos NAO alimentam o codegen. O spec que gera
// @splitbr/client e @splitbr/mock e vendor/swagger/openapi-v0_0_10.json.
//
// Ate 2026-09-04 este comentario afirmava que nao havia fonte publica para ele
// e que por isso nao dava para monitora-lo (o gap D-4). A afirmacao era falsa:
// o CGIBS publica o OAS em https://www.cgibs.gov.br/split-payment, sem login e
// sem mTLS, e o zip de la e byte-identico ao vendorado. O custo de acreditar
// nisso foi medido: o v1.1.0 saiu em 24/08/2026 e passou 11 dias sem deteccao.
// O quarto alvo abaixo fecha o buraco.
//
// Ele nao compara o OAS por conteudo, e sim o INVENTARIO de artefatos da
// pagina, porque o nome de cada arquivo carrega o timestamp de upload
// (202608/24154448-...), entao a URL de um arquivo nunca e alvo estavel. A
// pagina e. Artefato novo publicado ali vira chave a mais no diff.
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
  {
    name: "inventario de artefatos do Split Payment (CGIBS)",
    vendored: "vendor/cgibs-split-payment-artefatos.json",
    live: "https://www.cgibs.gov.br/split-payment",
    severity: "fail",
    // Indisponibilidade aqui nao reprova. A primeira versao deste comentario
    // dizia que o www.cgibs.gov.br bloqueava o runner do GitHub, com base num
    // unico run em que ele deu timeout e os tres alvos de tributos.gov.br
    // responderam (33901733965). O run seguinte desmentiu: o CGIBS respondeu
    // MATCH e os outros tres e que deram timeout (33902480218). Nao e bloqueio
    // de host nenhum; e a rede do runner com gov.br sendo intermitente, o mesmo
    // fenomeno que a issue #4 ja tinha classificado como falso positivo em
    // 2026-08-03 e que motivou o retry.
    //
    // Este alvo e o mais exposto: e o unico cuja indisponibilidade nao diz nada
    // sobre um contrato de producao, porque a pagina e so um indice. Drift ali
    // continua reprovando.
    severidadeIndisponivel: "ignore",
    kind: "inventario-html",
  },
];

// Servidor gov.br costuma recusar ou desafiar cliente sem user-agent de
// navegador; o do Node basta para tomar 403 ou um HTML de challenge.
export const USER_AGENT =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36";

// A pagina do CGIBS responde HTML. Extrair os links de /upload/arquivos/ e
// trata-los como um documento JSON deixa a maquinaria de comparacao inteira
// (normalize, canonical, diffSummary) valer para ela sem nenhum caso especial:
// um artefato novo aparece no relatorio como "(so no vivo)", igual a uma chave
// nova de schema. O host e removido para o inventario nao virar drift se o
// CGIBS trocar de dominio ou alternar http/https.
export function extrairInventario(html) {
  const artefatos = {};
  const re = /href=["']([^"']*\/upload\/arquivos\/[^"']+)["']/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    artefatos[m[1].replace(/^https?:\/\/[^/]+/, "")] = true;
  }
  return { artefatos };
}

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
  // _meta guarda os metadados do arquivo pinado do inventario (de onde veio,
  // quando foi capturado). Nao e conteudo do alvo: comparar a data de captura
  // daria drift em toda execucao. O prefixo _ existe para nao colidir com uma
  // chave real de contrato, que "fonte" ou "capturadoEm" poderiam ser.
  const { servers: _instanciaQueRespondeu, _meta: _metadados, ...semServersNaRaiz } = doc;
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
  // Um alvo pode reprovar em drift e nao reprovar em indisponibilidade: sao
  // sinais diferentes. "o contrato mudou" e achado; "nao consegui falar com o
  // host" pode ser so a topologia de rede de quem esta rodando.
  const seIndisponivel = target.severidadeIndisponivel ?? target.severity;
  if (vendoredDoc === null || vendoredDoc === undefined) {
    return { ...base, status: "setup-error", detail: "arquivo vendorado ausente ou ilegível" };
  }
  if (!liveResult || !liveResult.ok) {
    const status = liveResult?.kind === "parse" ? "malformed" : "unreachable";
    const tentativas = liveResult?.tentativas;
    const sufixo = tentativas && tentativas > 1 ? ` (apos ${tentativas} tentativas)` : "";
    return {
      ...base,
      severity: seIndisponivel,
      status,
      detail: `${liveResult?.error ?? "sem resposta"}${sufixo}`,
    };
  }
  if (canonical(vendoredDoc) === canonical(liveResult.doc)) return { ...base, status: "match" };
  return { ...base, status: "drift", changed: diffSummary(vendoredDoc, liveResult.doc) };
}

// Um alvo esta DIVERGENTE quando o contrato mudou, quando nao deu pra ler o
// contrato, ou quando o corpo veio quebrado. A severidade decide se isso
// reprova o run; nao decide se alguem fica sabendo (D-2, D-3).
const DIVERGENTE = new Set(["drift", "unreachable", "malformed"]);

// "ignore" e severidade de terceira via: aparece no relatorio, nao reprova o
// run e nao abre issue. Existe para uma indisponibilidade de causa conhecida e
// externa, que nao e sinal nenhum sobre o contrato.
const IGNORADO = (v) => v.severity === "ignore";

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
  const divergentes = verdicts.filter((v) => DIVERGENTE.has(v.status) && !IGNORADO(v));
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
      const aviso =
        v.severity === "ignore"
          ? " (indisponibilidade esperada neste ambiente, não reprova; drift ali continua reprovando)"
          : v.severity === "fail"
            ? ""
            : " (alvo informativo, não reprova)";
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
// O fetch do Node sempre lanca com a mensagem generica "fetch failed"; o motivo
// de verdade (DNS, TLS, ECONNREFUSED) fica em err.cause. Sem isso o log diz que
// falhou e nao diz por que, que e exatamente o defeito que este script existe
// para nao ter.
export function descreveErroDeRede(err) {
  const causa = err?.cause?.message ?? err?.cause?.code;
  return causa ? `${err.message} (${causa})` : err.message;
}

// Uma falha de rede pontual nao e um contrato que sumiu. Em 2026-08-03 um run
// reprovou com os tres alvos inalcancaveis enquanto outro runner falava com os
// mesmos endpoints 3 segundos antes; o re-run do mesmo commit passou. Sem
// retry, o detector reprova o build por soluco de rede, e detector que grita
// lobo acaba silenciado.
//
// Em 2026-09-04 isso se repetiu com 3 tentativas espacadas de 2s fixos: dois
// runs seguidos falharam, em alvos DIFERENTES a cada vez. Seis segundos de
// janela nao cobrem a intermitencia observada, entao o espacamento passou a ser
// exponencial (2s, 4s, 8s, 16s), o que da ~30s de janela em 5 tentativas em vez
// de 6s em 3. O timeout por tentativa tambem subiu: o erro observado e connect
// timeout de 10s, e o default do undici nao respeita o AbortSignal na fase de
// conexao.
//
// 4xx NAO e retentado de proposito: e resposta definitiva (a URL mudou ou
// sumiu), e insistir so atrasa o sinal que queremos receber rapido.
export const TENTATIVAS_PADRAO = 5;
export const ESPERA_PADRAO_MS = 2000;

// Espacamento exponencial: a n-esima espera e ESPERA_PADRAO_MS * 2^(n-1).
export function esperaDaTentativa(tentativa, base = ESPERA_PADRAO_MS) {
  return base * 2 ** (tentativa - 1);
}

export async function fetchLive(target, fetchImpl = fetch, opts = {}) {
  const {
    tentativas = TENTATIVAS_PADRAO,
    esperaMs = ESPERA_PADRAO_MS,
    dormir = (ms) => new Promise((r) => setTimeout(r, ms)),
  } = opts;

  let ultimaFalha;
  for (let tentativa = 1; tentativa <= tentativas; tentativa += 1) {
    let res;
    try {
      res = await fetchImpl(target.live, {
        signal: AbortSignal.timeout(30_000),
        headers: {
          "user-agent": USER_AGENT,
          accept: target.kind === "inventario-html" ? "text/html" : "application/json",
        },
      });
    } catch (err) {
      ultimaFalha = { ok: false, kind: "fetch", error: descreveErroDeRede(err), tentativas: tentativa };
      if (tentativa < tentativas) {
        await dormir(esperaDaTentativa(tentativa, esperaMs));
        continue;
      }
      return ultimaFalha;
    }

    if (!res.ok) {
      const valeRetentar = res.status >= 500;
      ultimaFalha = { ok: false, kind: "fetch", error: `HTTP ${res.status}`, tentativas: tentativa };
      if (valeRetentar && tentativa < tentativas) {
        await dormir(esperaDaTentativa(tentativa, esperaMs));
        continue;
      }
      return ultimaFalha;
    }

    try {
      if (target.kind === "inventario-html") {
        const html = await res.text();
        const doc = extrairInventario(html);
        // Zero artefato quase sempre significa pagina de erro ou desafio
        // anti-bot devolvido com 200, nao "o CGIBS apagou tudo". Tratar como
        // corpo quebrado evita apagar o inventario pinado por causa disso.
        if (Object.keys(doc.artefatos).length === 0) {
          return { ok: false, kind: "parse", error: `resposta ${res.status} nao lista nenhum artefato (pagina de erro ou desafio anti-bot?)` };
        }
        return { ok: true, doc };
      }
      return { ok: true, doc: await res.json() };
    } catch (err) {
      return { ok: false, kind: "parse", error: `resposta ${res.status} nao e JSON valido: ${err.message}` };
    }
  }
  return ultimaFalha;
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
