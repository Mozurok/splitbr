import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index.js";

// Comparado com o package.json, e nao com um literal: o literal deixava o
// teste passar com a constante parada numa versao antiga.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

describe("scaffold smoke", () => {
  it("exports the package version", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
