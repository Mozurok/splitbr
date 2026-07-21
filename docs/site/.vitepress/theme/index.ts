import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import FluxoDinheiro from "./FluxoDinheiro.vue";
import DemoSplit from "./DemoSplit.vue";
import "./custom.css";

// Direcao A "Fiscal claro" (D-9): tema claro com grid blueprint sutil e
// acento quente ambar; refs Mobbin em REFERENCES.md.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("FluxoDinheiro", FluxoDinheiro);
    app.component("DemoSplit", DemoSplit);
  },
} satisfies Theme;
