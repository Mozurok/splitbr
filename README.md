# splitbr

Toolkit open source de **Split Payment** do Brasil (IBS/CBS, LC 214/2025) para Node/TypeScript.

[![@splitbr/client no npm](https://img.shields.io/npm/v/@splitbr/client?label=%40splitbr%2Fclient&color=cb3837)](https://www.npmjs.com/package/@splitbr/client) [![@splitbr/mock no npm](https://img.shields.io/npm/v/@splitbr/mock?label=%40splitbr%2Fmock&color=cb3837)](https://www.npmjs.com/package/@splitbr/mock)

**Português** · [English ↓](#english)

O split payment da Reforma Tributária segrega o tributo no momento do pagamento: a parcela de CBS/IBS vai direto ao fisco antes de o valor chegar ao vendedor. Isso afeta todo mundo que vende no Brasil, mas quase ninguém consegue ver o mecanismo funcionando, porque a Plataforma Pública é restrita a PSPs homologados. Este repositório abre essa caixa-preta para qualquer pessoa:

- **Quer entender o que muda para a sua empresa?** Leia o [guia em português claro](docs/site/split-payment.md), sem código.
- **Quer ver a plataforma funcionando na sua máquina?** `npx @splitbr/mock` sobe um simulador fiel do contrato oficial em minutos ([tutorial](docs/site/tutorial.md)); nenhuma licença necessária.
- **Integra a plataforma de verdade (PSP homologado)?** O [@splitbr/client](packages/client) é o SDK tipado do contrato.

> **Aviso**: projeto independente e não oficial. Não é afiliado à RFB, ao Comitê Gestor do IBS, ao Serpro ou à Núclea. A fonte da verdade é sempre o contrato oficial, vendorado aqui com hash pinado (`vendor/MANIFEST.md`); quando o contrato mudar, os builds recusam artefatos divergentes.

## Pacotes

| Pacote | Para quem | O que faz |
|---|---|---|
| [@splitbr/mock](packages/mock) | Qualquer dev; nenhuma licença necessária | A plataforma inteira rodando local: os 7 fluxos documentados, matrizes de campos M/O/N-E como dados, segregação em 3 passos com rejeição integral de lote, long polling do Super Inteligente, motor de caos (429/503/circuit breaker) e cenários de divergência RSUP com os dois procedimentos de cálculo. |
| [@splitbr/client](packages/client) | Times que integram a plataforma real (PSPs homologados e provedores de conexão) | SDK TypeScript tipado: tipos gerados do OAS oficial, os 4 headers obrigatórios injetados por middleware, erros RFC 7807 tipados e a fórmula de segregação como função pura (centavos inteiros, truncamento para baixo). |

Roadmap (próxima fase, priorizada): validadores NF-e da NT 2025.002, que tocam toda empresa que emite nota no Brasil; depois o client da Calculadora oficial e o simulador de fluxo de caixa.

## Começando

```bash
npm install @splitbr/client
npx @splitbr/mock --port 8377
```

Os dois estão publicados no npm: [@splitbr/client](https://www.npmjs.com/package/@splitbr/client) e [@splitbr/mock](https://www.npmjs.com/package/@splitbr/mock).

```ts
import { createSplitClient } from "@splitbr/client";

const client = createSplitClient({
  baseUrl: "http://127.0.0.1:8377", // mock local; troque pelo ambiente do seu PSP
  tenantId: "12345678000199",
});
```

Cada pacote tem README próprio com exemplos completos. O mock também roda via Docker (`docker build -f packages/mock/Dockerfile -t splitbr/mock .`).

## Contrato oficial e drift

Os artefatos oficiais (o OAS da Plataforma, manuais, NTs) estão em `vendor/` com SHA-256 pinado em `vendor/MANIFEST.md`. Um workflow semanal compara quatro alvos com os vendorados: os três contratos hospedados da família Calculadora, por conteúdo normalizado, e o inventário de artefatos da [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment), que é onde o contrato da Plataforma é publicado. Divergência vira issue, nunca atualização silenciosa. A Calculadora oficial não é redistribuída (a distribuição não declara licença); use `scripts/download-calculadora.sh`.

A severidade é por alvo: portal e api-split reprovam o run tanto em divergência quanto em indisponibilidade; o piloto sinaliza sem reprovar, porque é infraestrutura de teste com janela até 31/12/2026 e mudar antes do portal é o comportamento esperado dele.

### O contrato da Plataforma está em v1.1.0; os pacotes ainda geram do v0.0.10

Em 24/08/2026 o CGIBS publicou o **OpenAPI v1.1.0** da Plataforma Pública, pareado com o Manual de Integração v1.1.0, e moveu o v0.0.10 para "versões anteriores". A mudança quebra o contrato:

- as 12 rotas de stream trocaram `{idPsp}/tributos` por `{cnpjRaizPspRecDir}/transacoes`;
- entraram 3 rotas do Mecanismo de Ocorrências (`/api/v1/moc/*`);
- o header `X-JWS-Signature` virou obrigatório nas 43 operações;
- os schemas foram de 57 para 78, com 33 dos 55 comuns alterados.

O v1.1.0 está vendorado aqui (`vendor/swagger/openapi-v1_1_0.json`), mas **ainda não alimenta o codegen**: `@splitbr/client` e `@splitbr/mock` continuam gerados do v0.0.10 e, portanto, implementam o contrato anterior. Migrar é um major bump nos dois pacotes e tem task própria. Até lá, quem integra a plataforma real deve ler o v1.1.0 como fonte da verdade.

**Correção de rota, registrada de propósito**: até 04/09/2026 este README afirmava que não existia fonte pública para esse contrato e que por isso ele não era monitorável. Era falso. O CGIBS publica o OAS numa página aberta, sem login e sem mTLS, e o zip de lá é byte-idêntico ao que já estava vendorado. O custo do engano foi medido: o v1.1.0 ficou 11 dias sem detecção. O detector agora observa aquela página como quarto alvo.

## Desenvolvimento

Monorepo pnpm: `pnpm install && pnpm -r build && pnpm -r test` (Node >= 22). Contribuições são bem-vindas depois do lançamento inicial; diretrizes de contribuição e CLA chegam em seguida.

## English

**splitbr** is the first open-source toolkit for Brazil's **Split Payment**, the withhold-the-tax-at-settlement mechanism introduced by the 2023 consumption-tax reform (the new CBS and IBS taxes, phasing in from 2026). Payment platforms split the tax out of each payment and send it straight to the tax authority before the seller is paid. The official platform is restricted to licensed payment providers (PSPs), so almost no one can see how it actually works. This repo opens that black box:

- **[@splitbr/mock](https://www.npmjs.com/package/@splitbr/mock)** is a faithful local mock of the whole platform: the 7 documented flows, the exact RFC 7807 error taxonomy, the per-arrangement field matrices as data, three-step segregation, Super Inteligente long-polling, and a chaos + divergence engine. Any developer can `npx @splitbr/mock` and test against it, no license required.
- **[@splitbr/client](https://www.npmjs.com/package/@splitbr/client)** is a typed TypeScript SDK generated from the official OpenAPI contract: the four mandatory headers injected by middleware, typed RFC 7807 errors, and the settlement formula as a pure function.

Engineering notes:

- The official contracts are vendored with a **pinned SHA-256**; a weekly CI diffs four targets against the vendored copies and **opens an issue on drift** instead of updating silently: the three live Calculadora contracts, by normalised content, plus the artifact inventory of the [CGIBS Split Payment page](https://www.cgibs.gov.br/split-payment), which is where the Platform contract itself is published. Severity is per target: the production endpoints fail the run, the pilot one reports without failing (it is test infrastructure and moving ahead is its job).
- **The Platform contract moved to v1.1.0 on 2026-08-24; the packages still generate from v0.0.10.** The new spec renames all 12 stream routes (`{idPsp}/tributos` to `{cnpjRaizPspRecDir}/transacoes`), adds 3 Mechanism-of-Occurrences routes, makes the `X-JWS-Signature` header required on all 43 operations, and grows the schema set from 57 to 78. v1.1.0 is vendored here but does not feed codegen yet: migrating is a major bump for both packages and has its own task. Until then, treat v1.1.0 as the source of truth if you integrate the real platform. Until 2026-09-04 this README claimed that spec had no public endpoint and so could not be monitored; that was false, and the error cost 11 days of undetected drift.
- Money math is **integer cents only** (BigInt), never floating point, truncated toward zero to match the official rounding.
- The interactive [demo](https://mozurok.github.io/splitbr/) computes every figure with the **same published function the SDK ships**, so it doubles as a live validation of the packages.

Independent, unofficial project: not affiliated with the Brazilian tax authorities, and not legal or tax advice. The guides and docs are in Portuguese, since the audience is Brazilian companies and developers preparing for the reform.

## Licença

[MIT](packages/client/LICENSE). Os documentos oficiais referenciados pertencem aos seus órgãos publicadores.
