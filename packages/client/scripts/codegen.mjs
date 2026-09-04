#!/usr/bin/env node
// Gera os tipos da Plataforma de Split Payment a partir do spec vendorado,
// recusando quando o hash em disco divergir do pinado em vendor/MANIFEST.md.
import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, "../../..");
const specPath = resolve(repoRoot, "vendor/swagger/openapi-v1_1_0.json");
const manifestPath = resolve(repoRoot, "vendor/MANIFEST.md");
const outPath = resolve(here, "../src/generated/platform.ts");

const manifest = readFileSync(manifestPath, "utf8");
const row = manifest.split("\n").find((l) => l.includes("swagger/openapi-v1_1_0.json"));
if (!row) throw new Error("MANIFEST.md row for swagger/openapi-v1_1_0.json not found");
const pinned = row.match(/\b([0-9a-f]{64})\b/)?.[1];
if (!pinned) throw new Error("pinned sha256 not found in the manifest row");

const actual = createHash("sha256").update(readFileSync(specPath)).digest("hex");
if (actual !== pinned) {
  console.error(`REFUSING: spec hash ${actual} != manifest ${pinned}`);
  process.exit(1);
}
console.log(`spec hash OK (${pinned.slice(0, 12)}...)`);

// Hermetic invocation: openapi-typescript imports the TS compiler factory API,
// which the TS 7 native port does not expose, so the generator runs with a
// pinned prior-line TypeScript, isolated from the workspace toolchain (D-2
// scoped fallback; build and tests stay on TS 7).
execFileSync(
  "pnpm",
  [
    "--package=typescript@5.9.3",
    "--package=openapi-typescript@7.13.0",
    "dlx",
    "openapi-typescript",
    specPath,
    "-o",
    outPath,
  ],
  { stdio: "inherit", cwd: resolve(here, "..") },
);

// Deep-$ref quirk: the spec references another response's schema via a JSON
// pointer (.../content/application~1json/schema); openapi-typescript maps the
// pointer segments literally, emitting one indexed access too many (in its
// output the content value already IS the schema). Strip that extra segment.
{
  let generatedSrc = readFileSync(outPath, "utf8");
  const pattern = /(components\["responses"\]\["[^"]+"\]\["content"\]\["application\/json"\])\["schema"\]/g;
  const hits = generatedSrc.match(pattern)?.length ?? 0;
  if (hits > 0) {
    generatedSrc = generatedSrc.replace(pattern, "$1");
    writeFileSync(outPath, generatedSrc);
  }
  console.log(`deep-ref postprocess: ${hits} occurrence(s) rewritten`);
}

// Quirk 2 (v1.1.0): MocOcorrenciaSol e MocOcorrenciaNot sao
// `allOf: [$ref MocOcorrencia, {required: [...], not: {anyOf: [...]}}]`, e o
// openapi-typescript 7.13.0 erra duas vezes no mesmo tipo: transforma o
// discriminador no literal com o NOME do schema (`arrj: "MocOcorrenciaSol"`,
// quando os valores validos sao BOL/PXE/PXD/PXA/TED/TEF) e traduz o `not` para
// `Record<string, never>`, que zera todas as demais propriedades. Resultado: as
// duas rotas POST do MOC ficam sem corpo tipavel.
//
// A regra que o spec expressa e discriminacao por presenca de campo: a
// Solicitacao de estorno EXIGE codMotOcor/vlCbsEst/vlIbsEst e PROIBE os campos
// de processo administrativo; a Notificacao proibe os tres de estorno. Isso o
// TypeScript escreve bem, com interseccao e `?: never`.
//
// Preferimos reescrever a saida a manter os tipos a mao: quando o upstream
// corrigir, some este bloco e o gerado continua igual. Um override manual, nao.
{
  let src = readFileSync(outPath, "utf8");
  const campo = (nome) =>
    `NonNullable<components["schemas"]["MocOcorrenciaBoleto"]["${nome}"]>`;

  const substituicoes = [
    {
      nome: "MocOcorrenciaSol",
      corpo: [
        `components["schemas"]["MocOcorrencia"] & {`,
        `            /** @description Solicitacao de estorno: os tres valores abaixo sao obrigatorios (spec: allOf[1].required). */`,
        `            codMotOcor: ${campo("codMotOcor")};`,
        `            vlCbsEst: ${campo("vlCbsEst")};`,
        `            vlIbsEst: ${campo("vlIbsEst")};`,
        `            /** @description Proibidos na solicitacao (spec: allOf[1].not.anyOf). */`,
        `            orgRespProcAdm?: never;`,
        `            numProcAdm?: never;`,
        `        }`,
      ].join("\n"),
    },
    {
      nome: "MocOcorrenciaNot",
      corpo: [
        `components["schemas"]["MocOcorrencia"] & {`,
        `            /** @description Notificacao: os campos de estorno sao proibidos (spec: allOf[1].not.anyOf). */`,
        `            codMotOcor?: never;`,
        `            vlCbsEst?: never;`,
        `            vlIbsEst?: never;`,
        `        }`,
      ].join("\n"),
    },
  ];

  let trocados = 0;
  for (const { nome, corpo } of substituicoes) {
    // Casa o tipo inteiro que o gerador emitiu numa linha so, ate o ; final.
    const re = new RegExp(
      `( {8}${nome}: )\\{\\s*arrj: "${nome}";\\s*\\} & \\(Omit<components\\["schemas"\\]\\["MocOcorrencia"\\], "arrj"> & Record<string, never>\\);`,
    );
    if (!re.test(src)) continue;
    src = src.replace(re, `$1${corpo};`);
    trocados += 1;
  }

  if (trocados !== substituicoes.length) {
    console.error(
      `REFUSING: esperava reescrever ${substituicoes.length} tipos do MOC, reescrevi ${trocados}. ` +
        `Se o openapi-typescript corrigiu o allOf+not, remova este bloco; se mudou a forma da saida, ajuste o padrao.`,
    );
    process.exit(1);
  }
  writeFileSync(outPath, src);
  console.log(`MOC allOf+not postprocess: ${trocados} tipo(s) reescrito(s)`);
}

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const expected = Object.keys(spec.paths).length;
const generated = readFileSync(outPath, "utf8");
const got = (generated.match(/^ {2,4}"\//gm) ?? []).length;
if (got !== expected) {
  console.error(`REFUSING: generated paths ${got} != spec paths ${expected}`);
  process.exit(1);
}
console.log(`generated paths OK (${got}/${expected})`);
