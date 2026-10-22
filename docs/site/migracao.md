---
title: Guia de migração
---

# Guia de migração

Registro das mudanças que quebram compatibilidade entre versões do `@splitbr/client` e do `@splitbr/mock`, com o que fazer em cada caso. Mais recente primeiro.

## 0.2.x para 0.3.0: o contrato oficial foi de v1.1.0 para v1.1.1

Em 24/09/2026 o CGIBS publicou o **OpenAPI v1.1.1**, junto com o Manual de Integração v1.1.1, aprovados pelo Ato Técnico Conjunto RFB/CGIBS nº 5. Os pacotes 0.3.0 são gerados desse contrato.

O salto é bem menor que o da 0.2.0: as rotas são as mesmas 35, os nomes de schema são os mesmos 78, e a assinatura não mudou. O que muda são campos removidos, então o compilador aponta cada lugar que precisa de ajuste.

### Resumo das mudanças

| | v1.1.0 (0.2.x) | v1.1.1 (0.3.0) |
|---|---|---|
| `indPgtoIntegral` | Boleto, Pix Dinâmico e Pix Automático | só Boleto |
| `cnpjRaizPspRecInd` | Boleto e arranjos Pix | só arranjos Pix |
| Respostas de erro 403, 410, 422 e 500 | `errors[]` | `resourceId`, sem `errors` |
| `resourceId` nas respostas de erro | não declarado | em todas |

### 1. `indPgtoIntegral` saiu dos arranjos Pix

No Informe Preliminar de Pagamento e no lote de segregação, Pix Dinâmico e Pix Automático não têm mais `indPgtoIntegral`. Antes o campo era obrigatório nesses arranjos. O manual explica: eles admitem um único pagamento por transação, então o indicador não diz nada. No Boleto o campo continua obrigatório.

Tire o campo dos corpos de Pix. Com o client 0.3.0, o TypeScript acusa o campo como propriedade desconhecida no objeto literal.

### 2. `cnpjRaizPspRecInd` saiu do Boleto

Os seis schemas de Boleto (transação iniciada, atualizada, baixa, preliminar, segregação e retorno do Super Inteligente) perderam `cnpjRaizPspRecInd`. Segundo o manual, quando existe um PSP Recebedor Indireto no Boleto, o CNPJ dele vai no campo do Recebedor. Nos arranjos Pix o campo continua opcional.

### 3. Erros trocaram `errors` por `resourceId`

Nas respostas `application/problem+json` de 403, 410 (stream e consulta retroativa), 500 e nos 422 de segregação, stream e MOC, o array `errors` saiu. Todas as respostas de erro ganharam `resourceId`, o identificador que o capítulo 9 do manual manda gerar para toda requisição, com sucesso ou erro. Os 400 continuam com `errors`, e o envelope 201 de sucesso também.

Se o seu tratamento de erro lia `errors` de um 422, passe a ler `detail`. Guarde o `resourceId` no log: é por ele que a plataforma rastreia a requisição.

### 4. Duas regras novas no manual, sem mudança de schema

- **Valor zero não é campo omitido.** Nos campos de valor de tributo, zero passa a significar "transação com split cujo valor a segregar é zero". Omitir o campo significa "transação sem split". Quem mandava `0` para dizer "não se aplica" precisa passar a omitir.
- **`dtHrIni` em transação que ganha dados fiscais depois.** Se a transação foi criada sem os campos fiscais e passou a tê-los por atualização, o Informe de Transação Iniciada vai com a data e hora da alteração.

### Divergência entre manuais: `hashPayload`

O Manual de Segurança v1.0.0, publicado no mesmo dia, lista um oitavo claim no protected header do JWS, `hashPayload`, com janela de 5 minutos para o `jti` e tolerância de 1 minuto no `iat`. O Manual de Integração v1.1.1 e o OpenAPI continuam com os sete atributos, e nenhum documento define o formato do `hashPayload`. O client e o mock seguem o OpenAPI. Se a plataforma passar a exigir o claim, isso vira uma versão nova.

### Migrando o `@splitbr/mock` para a 0.3.0

O mock 0.3.0 serve o contrato v1.1.1. Além de aplicar as mudanças acima, ele corrige três comportamentos que estavam errados na 0.2.0:

- **Códigos RSUP.** O mock trocava o significado dos finais 2 e 3. O correto, pelo capítulo 6 do manual, é x01 CBS corrigido, x02 CBS em aberto, x03 IBS corrigido, x04 IBS em aberto. Um teste que esperava `RSUP102` para `ibs-correcao` passa a receber `RSUP103`.
- **Baixa de Boleto.** O mock exigia `numPgto` na Baixa de Boleto, campo que o contrato tirou na v1.1.0, e rejeitava uma baixa válida. Agora rejeita o campo se ele vier.
- **`cnpjRaizPspRecInd` no TEF.** Era aceito, mas o manual marca como N/E. Agora é rejeitado.

### Compatibilidade

`^0.2.0` **não** puxa a 0.3.0: em versões `0.x`, o caret do npm não atravessa o minor.

## 0.1.x para 0.2.0: o contrato oficial foi de v0.0.10 para v1.1.0

Em 24/08/2026 o CGIBS publicou o **OpenAPI v1.1.0** da Plataforma Pública de Split Payment, junto com o Manual de Integração v1.1.0, e moveu a v0.0.10 para "versões anteriores". Os pacotes 0.2.0 são gerados desse contrato novo.

**A migração não é opcional se você integra a plataforma real.** O contrato antigo saiu do ar como referência corrente, e as rotas que a 0.1.x chama foram renomeadas.

::: warning Antes de começar
Uma parte do contrato v1.1.0 depende do **Manual de Segurança**, que ainda não tinha sido publicado quando esta seção foi escrita. É dele que sai o fluxo de JWKS por trás da assinatura, ou seja, como sua chave pública chega à plataforma. Ele saiu em 24/09/2026; a seção da 0.3.0 trata do que ele muda.
:::

### Resumo das mudanças

| | v0.0.10 (0.1.x) | v1.1.0 (0.2.0) |
|---|---|---|
| Rotas | 32 | 35 |
| Schemas | 57 | 78 |
| Autenticação de mensagem | 4 headers | assinatura `X-JWS-Signature` |
| Rotas de stream | `{idPsp}/tributos/...` | `{cnpjRaizPspRecDir}/transacoes/...` |
| Mecanismo de Ocorrências | não existia | 3 rotas |
| Pix Automático em transação atualizada | existia | removido |

### 1. Os quatro headers obrigatórios deixaram de existir

Esta é a mudança de maior impacto no código, e a mais fácil de aplicar.

O contrato v0.0.10 exigia `messageId`, `correlationId`, `tenantId` e `timestamp` em toda requisição. **Nenhum dos quatro existe no v1.1.0**: eles saíram de `components.parameters` e não são citados uma única vez no Manual de Integração v1.1.0. No lugar entrou um só, o `X-JWS-Signature`, obrigatório nas 43 operações.

```ts
// antes (0.1.x)
const client = createSplitClient({
  baseUrl: "https://...",
  tenantId: "12345678000199",
});

// depois (0.2.0)
const client = createSplitClient({
  baseUrl: "https://...",
  kid: "id-da-sua-chave",
  assinar: async (bytes) => assinarRS256(bytes),
});
```

`gerarCorrelationId` foi removido, e a validação de `tenantId` junto. `gerarTimestampSplit` **continua exportado**: deixou de ser header, mas o formato segue valendo para `infRequisicao.dtHrMsg`, que é campo de corpo obrigatório.

### 2. A assinatura `X-JWS-Signature`

Toda requisição passa a carregar uma assinatura JWS Compact Detached (RFC 7515) sobre o corpo canonicalizado em JCS (RFC 8785), com sete atributos obrigatórios no protected header: `alg` (RS256), `typ` (JWS), `kid`, `jti` (UUID v4), `iat` (NumericDate), `b64` (false) e `crit` (`["b64"]`).

**O client faz a parte difícil e você fica com a chave.** A canonicalização, o protected header, a montagem do formato detached e a garantia de que o corpo enviado é byte a byte o que foi assinado são responsabilidade do pacote. A operação RS256 sai por um callback:

```ts
import { createSign } from "node:crypto";
import { createSplitClient } from "@splitbr/client";

const client = createSplitClient({
  baseUrl: process.env.SPLIT_BASE_URL,
  kid: "minha-chave-01",
  assinar: (bytes) => {
    const s = createSign("RSA-SHA256");
    s.update(bytes);
    s.end();
    return new Uint8Array(s.sign(process.env.CHAVE_PRIVADA_PEM));
  },
});
```

Num HSM ou KMS, o callback vira a chamada do serviço e a chave privada nunca entra no processo:

```ts
assinar: async (bytes) => kms.sign({ KeyId, Message: bytes, SigningAlgorithm: "RSASSA_PKCS1_V1_5_SHA_256" }),
```

::: danger O erro que custa caro aqui
O `b64: false` da RFC 7797 significa que a assinatura cobre o **payload cru**, não uma versão em Base64URL. Se você montar a assinatura por fora e serializar o corpo por conta própria, as duas serializações divergem (ordem de chave, formato de número, escaping) e a plataforma rejeita uma assinatura que parece correta. É exatamente por isso que o client não aceita a assinatura pronta: existe uma serialização só, e é a que vai na rede.
:::

Se você precisa das peças isoladas, elas são públicas: `canonicalizarJcs`, `assinarRequisicao`, `montarProtectedHeader`, `montarEntradaDeAssinatura` e `conferirFormaDoHeader`.

### 3. As 12 rotas de stream foram renomeadas

O parâmetro de rota `{idPsp}` virou `{cnpjRaizPspRecDir}` (8 posições, a raiz do CNPJ, não mais um identificador opaco), e o segmento `/tributos/` virou `/transacoes/`.

```diff
- /api/v1/out/boleto/{idPsp}/tributos/stream/start
+ /api/v1/out/boleto/{cnpjRaizPspRecDir}/transacoes/stream/start
```

Vale para os três arranjos com stream (boleto, Pix Automático, Pix Dinâmico), nos modos `out` e `retroativo`, em `start`, consumo por token e `DELETE`.

O corpo da resposta acompanhou: a chave **`tributos` virou `transacoes`**.

Na consulta retroativa, os parâmetros `fromNsu` e `toNsu` viraram **`nsuInicial` e `nsuFinal`**.

### 4. Campos renomeados e tipos alterados

| Onde | Antes | Depois |
|---|---|---|
| Transação iniciada (boleto, Pix Automático, Pix Dinâmico) | `cnpjCpfPagOrig` | `cnpjPagOrig` |
| Finalização da segregação | `valorTotalCbs`, `valorTotalIbs` | `vlTotalCbs`, `vlTotalIbs` |
| Consulta retroativa | `fromNsu`, `toNsu` | `nsuInicial`, `nsuFinal` |
| Super Inteligente | `tributos` | `transacoes` |

**`cnpjCpfPagOrig` para `cnpjPagOrig` não é só um rename.** O campo antigo aceitava CPF de 11 dígitos ou CNPJ de 14; o novo aceita **apenas CNPJ de 14 posições**. Se você informava pagador pessoa física na transação iniciada, esse caminho deixou de existir no contrato.

Dois campos mudaram de tipo, de `integer` para `string`:

- `numIdentcBaixa` (pattern `^\d{1,19}$`)
- `nsuId` (pattern `^\d{1,19}$`)

::: tip Cuidado com comparação de NSU
Como `nsuId` virou string, `a > b` passa a comparar lexicograficamente. `"9" > "10"` é verdadeiro. Converta para número, ou compare com padding, antes de ordenar ou paginar.
:::

Dois campos ganharam formato fixo:

- **`numCodBarras`**: era 1 a 44 dígitos, agora são exatamente 44.
- **`idLote`**: era livre (1 a 16 posições), agora é `idInfSegr` seguido de um sequencial de 6 dígitos, 40 posições. Isso amarra o lote ao informe no próprio identificador.

E um campo novo, obrigatório no Retorno Super Inteligente: **`dtHrDisp`**, o instante em que a plataforma disponibilizou a mensagem para consumo.

### 5. `PATCH /api/v1/pix-automatico` deixou de existir

O Informe de Transação Atualizada passou a contemplar apenas Boleto e Pix Dinâmico. O Pix Automático saiu, e com ele os schemas `InformeDeTransacaoAtualizadaPixAutomaticoRequest` e `InformeDeTransacaoAtualizadaPixAutomaticoTransacao`. O `POST` da mesma rota continua existindo.

### 6. Mecanismo de Ocorrências (MOC): três rotas novas

Recurso novo, nada a migrar. São três rotas:

- `POST /api/v1/moc/solicitacao`, para solicitar estorno
- `POST /api/v1/moc/notificacao`, para notificar
- `GET /api/v1/moc/{cnpjRaizPspRecDir}/ocorrencias`, para consultar as que já receberam resposta da RFB ou do CGIBS

A diferença entre solicitação e notificação é **por presença de campo**, não por rota: a solicitação exige `codMotOcor`, `vlCbsEst` e `vlIbsEst` e proíbe os campos de processo administrativo; a notificação proíbe os três de estorno. Mandar o corpo errado na rota errada dá 400.

O mock simula a resposta da RFB/CGIBS de forma determinística, para o ciclo fechar sem depender da plataforma real.

## Migrando o `@splitbr/mock`

O mock 0.2.0 serve o contrato v1.1.0. Duas mudanças afetam quem já tem teste escrito contra ele:

**Os quatro headers antigos não são mais exigidos.** Ele continua aceitando os quatro e ecoando o `correlationId` na resposta, que é útil para depurar uma jornada, mas nenhum deles é obrigatório. Testes que os enviavam continuam passando; testes que verificavam o 400 por ausência deles precisam mudar.

**A assinatura é conferida na forma, não exigida.** Se o header `X-JWS-Signature` vier, o mock decodifica o protected header e cobra os sete atributos com os valores fixos. Se não vier, deixa passar. Isso mantém o `npx splitbr-mock` utilizável sem par de chaves, e ainda pega o erro mais provável em produção, que é mandar um JWS bem-formado com `b64` errado ou com o payload anexado em vez de detached.

Para o comportamento fiel ao contrato, ligue a exigência:

```ts
buildServer({ exigirAssinatura: true });
```

## Compatibilidade

`^0.1.1` **não** puxa a 0.2.0 automaticamente: em versões `0.x`, o caret do npm não atravessa o minor. Quem depende assim continua na linha antiga até subir de propósito.

A linha 0.1.x segue no npm e implementa a v0.0.10, que a fonte oficial aposentou. Ela serve para quem ainda integra um ambiente preso ao contrato antigo, não para trabalho novo.
