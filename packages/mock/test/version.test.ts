import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { VERSION } from "../src/index.js";

// A constante ficou em "0.1.0" durante a 0.1.1 e a 0.2.0 inteiras, porque
// nenhum teste a conferia. Agora ela acompanha o package.json.
const pkg = JSON.parse(readFileSync(new URL("../package.json", import.meta.url), "utf8")) as {
  version: string;
};

describe("versao exportada", () => {
  it("VERSION bate com o package.json", () => {
    expect(VERSION).toBe(pkg.version);
  });
});
