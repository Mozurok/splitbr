import { defineConfig } from "vitepress";

const SITE_URL = "https://mozurok.github.io/splitbr";
const DEFAULT_DESCRIPTION =
  "Toolkit open source do Split Payment brasileiro (IBS/CBS, LC 214/2025): client tipado, mock local da plataforma e guia em portugues claro";

// Site publico do splitbr (D-5): VitePress 1.6.4 estavel, locale raiz pt-BR,
// dark mode e busca local nativos, base do GitHub Pages de projeto.
export default defineConfig({
  lang: "pt-BR",
  title: "splitbr",
  description: DEFAULT_DESCRIPTION,
  base: "/splitbr/",
  lastUpdated: true,
  head: [
    ["link", { rel: "icon", type: "image/svg+xml", href: "/splitbr/favicon.svg" }],
    ["link", { rel: "icon", type: "image/png", sizes: "32x32", href: "/splitbr/favicon-32.png" }],
    ["link", { rel: "apple-touch-icon", href: "/splitbr/apple-touch-icon.png" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "splitbr" }],
    ["meta", { name: "twitter:card", content: "summary_large_image" }],
  ],
  // Sem essas tags, o link previa titulo/descricao (via <title>/description) mas
  // nenhuma imagem: cada pagina ganha og:title/description/image proprios aqui.
  transformPageData(pageData) {
    // pageData.title sozinho fica so "splitbr" na home (sem h1 normal, o hero
    // nao conta); usa hero.name + hero.text pra bater com o que a home mostra.
    const hero = pageData.frontmatter.hero;
    const title = hero ? `${hero.name} · ${hero.text}` : pageData.title || "splitbr";
    const description = pageData.description || DEFAULT_DESCRIPTION;
    const path = pageData.relativePath.replace(/index\.md$/, "").replace(/\.md$/, "");
    const url = `${SITE_URL}/${path}`;
    const image = `${SITE_URL}/og-image.png`;

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ["meta", { property: "og:title", content: title }],
      ["meta", { property: "og:description", content: description }],
      ["meta", { property: "og:url", content: url }],
      ["meta", { property: "og:image", content: image }],
      ["meta", { name: "twitter:title", content: title }],
      ["meta", { name: "twitter:description", content: description }],
      ["meta", { name: "twitter:image", content: image }],
    );
  },
  themeConfig: {
    logo: "/favicon.svg",
    nav: [
      { text: "Guia", link: "/tutorial" },
      { text: "Entenda", link: "/split-payment" },
      { text: "Referência", link: "/referencia/client" },
      { text: "Leis e novidades", link: "/novidades" },
    ],
    sidebar: [
      {
        text: "Começar",
        items: [
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
