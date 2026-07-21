---
title: "@splitbr/mock"
---

<!-- GERADO de packages/mock/README.md pelo scripts/site-sync-readmes.mjs; NAO editar aqui -->

# @splitbr/mock

Esta página é gerada do README do pacote a cada build.

Mock local da **Plataforma Pública do Split Payment** (IBS/CBS, LC 214/2025) para qualquer dev entender e testar o comportamento da plataforma. Você não precisa ser PSP homologado para usar isto: o mock roda local, sem licença nenhuma.

A plataforma real é restrita a PSPs homologados. Este mock reproduz o contrato oficial na sua máquina: os sete fluxos documentados, os quatro headers obrigatórios, a taxonomia de erros RFC 7807, a segregação em 3 passos e o streaming do Super Inteligente, mais um motor de caos e cenários que a plataforma real nunca vai te dar em homologação.

> **Aviso**: projeto independente e não oficial. Não é afiliado à RFB, ao Comitê Gestor do IBS ou à Núclea. A fonte da verdade é o contrato oficial (OAS v0.0.10), embarcado com hash pinado. Quando o contrato mudar, o mock recusa subir com uma cópia adulterada.

## Instalação e uso

```bash
# via npx
npx @splitbr/mock --port 8377

# via Docker (build a partir da raiz do monorepo)
docker build -f packages/mock/Dockerfile -t splitbr/mock .
docker run -p 8377:8377 splitbr/mock
```

Flags do CLI: `--port` (8377), `--host` (127.0.0.1), `--seed` (1, determinístico), `--stream-timeout` (25000 ms), `--resource-id-consulta` (liga o stub), `--verbose`.

## Uso com @splitbr/client

```ts
import { createSplitClient } from "@splitbr/client";

const client = createSplitClient({
  baseUrl: "http://127.0.0.1:8377",
  tenantId: "12345678000199", // CNPJ alfanumérico do PSP (14 posições)
});

const { data } = await client.POST("/api/v1/boleto", {
  body: {
    infRequisicao: { dtHrMsg: "2026-07-20T10:00:00-03:00" },
    transacoes: [/* ... */],
  },
});
// data.resourceId, data.numValidos, data.numErros
```

Os quatro headers obrigatórios (messageId, correlationId, tenantId, timestamp) são injetados pelo client e validados pelo mock exatamente como na tabela do Manual de Integração.

## O que o mock cobre

| Fluxo | Endpoints | Arranjos |
|---|---|---|
| Transação Iniciada / Atualizada | `POST/PATCH /api/v1/{arranjo}` | boleto, pix-automatico, pix-dinamico |
| Baixa (exceto pagamento) | `POST .../baixa-exceto-pagamento` | boleto, pix-automatico, pix-dinamico |
| Informe Preliminar de Pagamento | `POST .../informe-preliminar-pagamento` | os 6 arranjos |
| Segregação (3 passos) | `POST /api/v1/segregacao` → `POST .../lotes` → `POST /api/v1/segregacao/finalizacao` | os 6 arranjos |
| Retorno Super Inteligente | `GET /api/v1/out/.../stream/start` e `/{token}`, `DELETE /{token}` | boleto, pix-automatico, pix-dinamico |
| Consulta Retroativa | `GET /api/v1/retroativo/.../stream/start?fromNsu=...` | boleto, pix-automatico, pix-dinamico |

Comportamentos fiéis ao manual: matrizes M/O/N-E por arranjo aplicadas a partir de dados (`data/matrices/`), rejeição integral de lote com reenvio corrigido, cross-validação da finalização em centavos inteiros (1 centavo de divergência falha), long polling com rotação de token, 204 na janela vazia e teardown via DELETE.

## Caos e cenários

```bash
# armar um 503 com circuit breaker aberto
curl -X POST localhost:8377/_chaos -H 'content-type: application/json' \
  -d '{"circuito503": {"retryAfterSeconds": 60, "retryAllowed": false}}'

# limpar
curl -X DELETE localhost:8377/_chaos

# injetar uma divergência de CBS (evento RSUP101 no stream do PSP)
curl -X POST localhost:8377/_scenario/divergencia -H 'content-type: application/json' \
  -d '{"arranjo": "boleto", "idPsp": "PSP00001", "chave": "CTRL000001", "tipo": "cbs-correcao", "procedimento": "padrao"}'
```

Flags de caos: `rate429`, as três variantes de 503 do manual (`circuito503` com circuit breaker, `indisponivel503` transitório, `manutencao503` janela programada), `erro500`, `timeout504`, `auth401` (variantes `cert-expirado`, `cert-invalido`, `token-invalido`), `forbidden403`. Cada uma responde com o status e os headers exatos da taxonomia do manual (`Retry-After`, `X-Circuit-Breaker`, `X-Retry-Allowed`, `X-Error-Type`).

Cenários de divergência: `cbs-correcao`, `ibs-correcao`, `cbs-em-aberto`, `ibs-em-aberto`, calculados pelo procedimento `padrao` (proporcional por operação, mesma função pura do @splitbr/client) ou `simplificado` (percentual preestabelecido, Decreto art. 28). Atenção: os percentuais oficiais do simplificado (LC 214 art. 33: por setor econômico ou contribuinte, via atos RFB/CGIBS) ainda não foram publicados; o default do mock é um placeholder rotulado que espelha a alíquota-teste 2026 (CBS 0,9%, IBS 0,1%) e deve ser configurado por chamada quando os valores reais saírem.

## Limitações conhecidas

- A semântica por dígito dos códigos RSUP (1 = CBS correção, 2 = IBS correção, 3 = CBS em aberto, 4 = IBS em aberto) é interpretação deste mock; o spec v0.0.10 publica só o enum. Será ajustada quando o Manual de Operações detalhar código a código.
- Limites de rate (429) e a janela do long polling não são fixados pelas fontes oficiais; aqui são configuráveis.
- Os percentuais do Split Payment Simplificado não têm valores oficiais publicados (jul/2026); o default é placeholder rotulado, não uma tabela real.
- Autenticação é simulada (token fake + variantes de erro por flag). Não há mTLS real.
- Estado é em memória e zera a cada processo; use `--seed` para reprodutibilidade.
- A consulta por ResourceId ainda não foi especificada pelo manual; existe como stub atrás de `--resource-id-consulta` (responde 501).

## Licença

MIT. Os artefatos oficiais (spec, manuais) pertencem aos seus órgãos publicadores e são referenciados por hash, não redistribuídos além do contrato OAS necessário à validação.
