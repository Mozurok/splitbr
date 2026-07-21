import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// Testa a logica da demo (docs/site). Fica aqui, fora de packages/*, para nao
// interferir no `pnpm -r test` dos pacotes (a busca de config do vitest sobe a
// arvore a partir de packages/*, nunca alcanca docs/site). Rodar da raiz com
// `pnpm test:site` (o script builda o @splitbr/client antes).
export default defineConfig({
  test: {
    root: fileURLToPath(new URL(".", import.meta.url)),
    include: [".vitepress/theme/demo/**/*.test.ts"],
  },
});
