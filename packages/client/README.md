# @splitbr/client

> **Para quem é este pacote:** engenheiros integrando a Plataforma Pública diretamente, hoje PSPs homologados e provedores de conexão autorizados. Se você quer entender ou simular o split payment sem essa licença, comece pelo [@splitbr/mock](https://github.com/Mozurok/splitbr/tree/main/packages/mock) e pelo [guia em português claro](https://mozurok.github.io/splitbr/split-payment) do site.

> Client TypeScript tipado para a Plataforma Pública do Split Payment (IBS/CBS, LC 214/2025), gerado a partir do OpenAPI oficial com hash pinado.

**Avisos:** esta biblioteca não é aconselhamento jurídico nem tributário. Não tem afiliação com RFB, CGIBS, Serpro ou Núclea. O comportamento deriva de especificações oficiais públicas (spec v0.0.10, pré-1.0) e pode mudar; confira sempre a fonte primária.

## O que vem dentro

- **Client tipado** para os 32 endpoints da plataforma (todos os arranjos da Etapa 1: boleto, Pix Dinâmico/Automático/Estático, TED, TEF), sobre [openapi-fetch].
- **Headers obrigatórios automáticos** em toda requisição: `messageId` (UUID v4 único), `correlationId` (19 posições, propagado verbatim quando você fornece), `tenantId` (CNPJ alfanumérico, 14 posições) e `timestamp` (ISO 8601 com offset `-03:00`), nos formatos exatos do Manual de Integração v1.0.
- **Erros RFC 7807 tipados**: corpos `application/problem+json` viram `ProblemDetail`, com `Retry-After` (segundos), `X-Circuit-Breaker`, `X-Retry-Allowed` e `X-Error-Type` expostos como campos.
- **Fórmula de segregação** como função pura standalone: `R = min((Vp/Vt) × C; C; A)` por tributo, aritmética inteira em centavos (BigInt), truncamento sempre PARA BAIXO em 2 casas, sem ponto flutuante no caminho de cálculo.
- **Tipos de domínio**: as 5 categorias de valor (Informado, Corrigido, Em Aberto, Segregado, Aplicado), papéis de PSP e tributos.

## Uso

```ts
import { createSplitClient, calcularSegregacao } from "@splitbr/client";

const client = createSplitClient({
  baseUrl: "https://<ambiente-do-psp>",
  tenantId: "12345678000199", // CNPJ do PSP (alfanumérico suportado)
});

const { data, error } = await client.POST("/api/v1/boleto", { body: /* tipado */ });

// Fórmula de segregação (valores em centavos inteiros, por tributo):
const segregadoCbs = calcularSegregacao({
  valorPagoCentavos: 5_000,
  valorOriginalCentavos: 10_000,
  informadoCentavos: 900,
  emAbertoCentavos: 10_000,
}); // => 450
```

## Requisitos

- Node.js >= 22 (ESM).

## Regeneração de tipos

Os tipos são gerados de `vendor/swagger/openapi-v0_0_10.json` (hash pinado em `vendor/MANIFEST.md`); o script de codegen recusa rodar se o spec em disco divergir do hash. Nada aqui busca a API viva em tempo de build.

## Licença

MIT. Uma versão em inglês desta documentação pode ser adicionada futuramente como seção secundária.

[openapi-fetch]: https://openapi-ts.dev
