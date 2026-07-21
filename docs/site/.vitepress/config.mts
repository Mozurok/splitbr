import { defineConfig } from "vitepress";

// Site publico do splitbr (D-5): VitePress 1.6.4 estavel, locale raiz pt-BR,
// dark mode e busca local nativos, base do GitHub Pages de projeto.
export default defineConfig({
  lang: "pt-BR",
  title: "splitbr",
  description:
    "Toolkit open source do Split Payment brasileiro (IBS/CBS, LC 214/2025): client tipado, mock local da plataforma e guia em portugues claro",
  base: "/splitbr/",
  lastUpdated: true,
  themeConfig: {
    nav: [
      { text: "Demo", link: "/demo" },
      { text: "Guia", link: "/tutorial" },
      { text: "Entenda", link: "/split-payment" },
      { text: "Referência", link: "/referencia/client" },
      { text: "Leis e novidades", link: "/novidades" },
    ],
    sidebar: [
      {
        text: "Começar",
        items: [
          { text: "Demo interativa", link: "/demo" },
          { text: "Split payment em português claro", link: "/split-payment" },
          { text: "Rode em 10 minutos", link: "/tutorial" },
        ],
      },
      {
        text: "Referência",
        items: [
          { text: "@splitbr/client", link: "/referencia/client" },
          { text: "@splitbr/mock", link: "/referencia/mock" },
        ],
      },
      {
        text: "Regulação",
        items: [
          { text: "Base legal", link: "/base-legal" },
          { text: "Novidades", link: "/novidades" },
          { text: "Estado da regulação", link: "/estado-regulacao" },
        ],
      },
    ],
    socialLinks: [{ icon: "github", link: "https://github.com/Mozurok/splitbr" }],
    outline: { label: "Nesta página" },
    darkModeSwitchLabel: "Aparência",
    lightModeSwitchTitle: "Mudar para tema claro",
    darkModeSwitchTitle: "Mudar para tema escuro",
    sidebarMenuLabel: "Menu",
    returnToTopLabel: "Voltar ao topo",
    docFooter: { prev: "Anterior", next: "Próxima" },
    lastUpdatedText: "Atualizado em",
    search: {
      provider: "local",
      options: {
        translations: {
          button: { buttonText: "Buscar", buttonAriaLabel: "Buscar no site" },
          modal: {
            displayDetails: "Mostrar detalhes",
            resetButtonTitle: "Limpar busca",
            backButtonTitle: "Fechar",
            noResultsText: "Nada encontrado para",
            footer: {
              selectText: "para selecionar",
              navigateText: "para navegar",
              closeText: "para fechar",
            },
          },
        },
      },
    },
    footer: {
      message:
        'Projeto independente e não oficial. Não afiliado à RFB, ao Comitê Gestor do IBS, ao Serpro ou à Núclea. Não é aconselhamento jurídico nem tributário.<br>Encontrou uma inconsistência? <a href="https://github.com/Mozurok/splitbr/issues" target="_blank" rel="noreferrer">Abra uma issue</a> que eu corrijo.',
      copyright: "MIT · splitbr",
    },
  },
});
