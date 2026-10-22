import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import FluxoDinheiro from "./FluxoDinheiro.vue";
import DemoSplit from "./DemoSplit.vue";
import Inicio from "./Inicio.vue";
import "./custom.css";

// Tema "lambe-lambe" (redesign de 2026-10-22): cartaz de rua, gradiente
// fluorescente e letra condensada. A home e o componente Inicio, com a
// animacao de rolagem em GSAP; detalhes em custom.css.
export default {
  extends: DefaultTheme,
  enhanceApp({ app }) {
    app.component("FluxoDinheiro", FluxoDinheiro);
    app.component("DemoSplit", DemoSplit);
    app.component("Inicio", Inicio);
  },
} satisfies Theme;
