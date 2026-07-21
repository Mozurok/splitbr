# splitbr

Toolkit open source de **Split Payment** do Brasil (IBS/CBS, LC 214/2025) para Node/TypeScript.

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

```ts
import { createSplitClient } from "@splitbr/client";

const client = createSplitClient({
  baseUrl: "http://127.0.0.1:8377", // mock local; troque pelo ambiente do seu PSP
  tenantId: "12345678000199",
});
```

Cada pacote tem README próprio com exemplos completos. O mock também roda via Docker (`docker build -f packages/mock/Dockerfile -t splitbr/mock .`).

## Contrato oficial e drift

Os artefatos oficiais (OAS v0.0.10, manuais, NTs) estão em `vendor/` com SHA-256 pinado em `vendor/MANIFEST.md`. Um workflow semanal compara os contratos hospedados com os vendorados por conteúdo normalizado; divergência quebra o build e vira issue, nunca atualização silenciosa. A Calculadora oficial não é redistribuída (a distribuição não declara licença); use `scripts/download-calculadora.sh`.

## Desenvolvimento

Monorepo pnpm: `pnpm install && pnpm -r build && pnpm -r test` (Node >= 22). Contribuições são bem-vindas depois do lançamento inicial; diretrizes de contribuição e CLA chegam em seguida.

## Licença

[MIT](packages/client/LICENSE). Os documentos oficiais referenciados pertencem aos seus órgãos publicadores.
