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
const specPath = resolve(repoRoot, "vendor/swagger/openapi-v0_0_10.json");
const manifestPath = resolve(repoRoot, "vendor/MANIFEST.md");
const outPath = resolve(here, "../src/generated/platform.ts");

const manifest = readFileSync(manifestPath, "utf8");
const row = manifest.split("\n").find((l) => l.includes("swagger/openapi-v0_0_10.json"));
if (!row) throw new Error("MANIFEST.md row for swagger/openapi-v0_0_10.json not found");
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

const spec = JSON.parse(readFileSync(specPath, "utf8"));
const expected = Object.keys(spec.paths).length;
const generated = readFileSync(outPath, "utf8");
const got = (generated.match(/^ {2,4}"\//gm) ?? []).length;
if (got !== expected) {
  console.error(`REFUSING: generated paths ${got} != spec paths ${expected}`);
  process.exit(1);
}
console.log(`generated paths OK (${got}/${expected})`);
