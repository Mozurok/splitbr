#!/usr/bin/env node
/**
 * Gera as páginas de referência do site a partir dos READMEs dos pacotes.
 * Fonte da verdade: packages/<x>/README.md. Os arquivos em docs/site/referencia/
 * são sobrescritos a cada execução; não edite os arquivos gerados.
 */
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const pairs = [
  {
    source: "packages/client/README.md",
    target: "docs/site/referencia/client.md",
    title: "@splitbr/client",
  },
  {
    source: "packages/mock/README.md",
    target: "docs/site/referencia/mock.md",
    title: "@splitbr/mock",
  },
];

for (const { source, target, title } of pairs) {
  const sourcePath = path.join(repoRoot, source);
  const targetPath = path.join(repoRoot, target);

  let raw;
  try {
    raw = await readFile(sourcePath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") {
      console.error(`ERRO: README de origem não encontrado: ${source}`);
      console.error("A página do site não pode ser gerada sem o README do pacote.");
      process.exit(1);
    }
    throw err;
  }

  // Remove o H1 da primeira linha (o título é reposto abaixo) e espaços em branco iniciais.
  const lines = raw.split("\n");
  if (lines[0] && lines[0].startsWith("# ")) {
    lines.shift();
  }
  const body = lines.join("\n").replace(/^\s*\n/, "");

  const output = [
    "---",
    `title: "${title}"`,
    "---",
    "",
    `<!-- GERADO de ${source} pelo scripts/site-sync-readmes.mjs; NAO editar aqui -->`,
    "",
    `# ${title}`,
    "",
    "Esta página é gerada do README do pacote a cada build.",
    "",
    body.trimEnd(),
    "",
  ].join("\n");

  await mkdir(path.dirname(targetPath), { recursive: true });
  await writeFile(targetPath, output, "utf8");
  console.log(`gerado: ${target} (de ${source})`);
}
