---
layout: home

hero:
  name: splitbr
  text: Split Payment do Brasil, aberto e testável
  tagline: "A Reforma Tributária vai separar o imposto no momento do pagamento. Você não precisa ser um PSP (banco ou instituição de pagamento homologada) para usar isto: o toolkit deixa você entender e simular isso hoje, na sua máquina, de graça."
  actions:
    - theme: brand
      text: Veja seu dinheiro se dividir
      link: "#veja-o-split-payment-acontecer"
    - theme: alt
      text: Entenda o split payment
      link: /split-payment
    - theme: alt
      text: Rode em 10 minutos
      link: /tutorial

features:
  - icon: 🏢
    title: Para quem tem empresa ou é contador
    details: O split payment explicado em português claro, sem código. O que muda no seu caixa, quem é alcançado, quando começa e o que perguntar ao seu contador. Sua empresa nunca chama a API, quem chama é o banco ou PSP dela.
    link: /split-payment
    linkText: Ler o guia
  - icon: 🧑‍💻
    title: Para quem desenvolve, sem licença nenhuma
    details: Um mock local fiel da Plataforma Pública, para qualquer dev entender e testar o split. Os 7 fluxos documentados, taxonomia de erros exata, caos e cenários de divergência que a homologação real não te dá.
    link: /referencia/mock
    linkText: Ver a referência
  - icon: 🏦
    title: Para times que integram a plataforma real
    details: Um SDK TypeScript tipado do contrato oficial, para bancos e instituições de pagamento homologados pelo Comitê Gestor do IBS. Este é o pedaço de nicho do toolkit.
    link: /referencia/client
    linkText: Ver a referência
  - icon: 📡
    title: Sempre atualizado
    details: As fontes oficiais (CGIBS, Portal NF-e, Receita Federal, Calculadora) são verificadas toda segunda-feira. Mudança de norma ou contrato vira registro público em Novidades.
    link: /novidades
    linkText: Ver novidades
---

## Veja o split payment acontecer

Antes de qualquer código ou conta, siga o passo a passo abaixo e veja o imposto ser separado no momento do pagamento. Depois, brinque com os valores você mesmo.

<DemoSplit />

Quer os detalhes em português claro? Leia [o guia completo](/split-payment). Prefere rodar na sua máquina? Siga o [tutorial de 10 minutos](/tutorial).

## Por que este projeto existe

A Plataforma Pública do Split Payment é restrita a PSPs homologados, e até julho de 2026 não encontramos nenhuma ferramenta open source de split payment em nenhuma linguagem. Quem precisa se preparar (bancos, fintechs, ERPs, software houses e as próprias empresas) não tinha onde encostar a mão. Mas você não precisa ser PSP para usar o splitbr: o guia em português serve para qualquer empresa, e o mock roda para qualquer dev, sem licença nenhuma.

O splitbr fecha esse buraco com dois pacotes testados e um princípio: o contrato oficial, vendorado com hash pinado, é sempre a fonte da verdade. Quando o contrato muda, o build quebra em vez de mentir.

| Pacote | O que faz |
|---|---|
| [@splitbr/mock](/referencia/mock) | A plataforma inteira rodando local, sem precisar de licença nenhuma: 7 fluxos, matrizes de campos como dados, segregação em 3 passos, long polling do Super Inteligente, motor de caos e divergências RSUP. |
| [@splitbr/client](/referencia/client) | SDK TypeScript tipado da plataforma, para PSPs homologados (o pedaço de nicho do toolkit): tipos gerados do OpenAPI oficial, os 4 headers obrigatórios injetados, erros RFC 7807 tipados e a fórmula de segregação como função pura. |

Roadmap: a prioridade são os validadores NF-e da NT 2025.002, porque tocam toda empresa que emite nota fiscal. Depois vêm o client da Calculadora oficial e um simulador de fluxo de caixa. A lista curada de fontes oficiais vive no [awesome-split-payment](https://github.com/Mozurok/awesome-split-payment).

> Projeto independente e não oficial. Não é afiliado à RFB, ao Comitê Gestor do IBS, ao Serpro ou à Núclea, e nada aqui é aconselhamento jurídico ou tributário. Confira sempre a [fonte primária](/base-legal).
