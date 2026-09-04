# Changelog

## 0.2.0 (2026-09-04)

**Quebra compatibilidade.** Migra para o contrato oficial **OpenAPI v1.1.0**, publicado pelo CGIBS em 24/08/2026. Veja o [guia de migração](https://mozurok.github.io/splitbr/migracao).

- Tipos gerados do v1.1.0: 35 rotas, 78 schemas.
- **Os quatro headers obrigatórios saíram.** `messageId`, `correlationId`, `tenantId` e `timestamp` não existem no contrato novo. `splitHeadersMiddleware` e `gerarCorrelationId` foram removidos; `gerarTimestampSplit` continua, porque o formato segue valendo para `infRequisicao.dtHrMsg`.
- **Assinatura `X-JWS-Signature`**, obrigatória nas 43 operações: canonicalização JCS (RFC 8785), protected header com os sete atributos do capítulo 8 do manual e JWS Compact Detached (RFC 7515). A operação RS256 é um callback seu, então a chave privada nunca entra no pacote.
- O corpo enviado passa a ser o corpo canonicalizado que foi assinado, byte a byte. O `b64: false` do contrato torna isso condição de a assinatura validar.
- `createSplitClient` troca `tenantId` por `kid` e `assinar`.
- Novos exports: `canonicalizarJcs`, `canonicalizarJcsBytes`, `assinarRequisicao`, `montarProtectedHeader`, `montarEntradaDeAssinatura`, `conferirFormaDoHeader`, `base64url`.
- `PATCH /api/v1/pix-automatico` deixou de existir (o Informe de Transação Atualizada perdeu o Pix Automático).
- Campos: `cnpjCpfPagOrig` virou `cnpjPagOrig` e passou a aceitar **só CNPJ**; `valorTotalCbs`/`valorTotalIbs` viraram `vlTotalCbs`/`vlTotalIbs`; `numIdentcBaixa` e `nsuId` viraram string; `numCodBarras` exige 44 dígitos; `idLote` passou a ser `idInfSegr` mais sequencial (40 posições).
- O codegen ganhou um pós-processamento para os tipos do MOC: o `allOf` com `not` do spec faz o openapi-typescript emitir tipos inconstruíveis, e a reescrita fica no gerador para sumir sozinha quando o upstream corrigir.

## 0.1.1 (2026-09-04)

Release de vigilância: nenhuma mudança de comportamento ou de API. O que muda é o que o pacote diz sobre si.

- Aviso no README: o contrato oficial da Plataforma saiu para a **v1.1.0** em 24/08/2026 e este pacote continua gerado da v0.0.10. A v1.1.0 renomeia as 12 rotas de stream (`{idPsp}/tributos` para `{cnpjRaizPspRecDir}/transacoes`), acrescenta 3 rotas do Mecanismo de Ocorrências, torna o header `X-JWS-Signature` obrigatório nas 43 operações e leva os schemas de 57 para 78. Quem integra a plataforma real deve tratar a v1.1.0 como fonte da verdade; a migração deste pacote é um major bump e está em aberto.
- `prepublishOnly` roda build, typecheck e testes antes de publicar. Sem ele, uma publicação a partir de um clone limpo geraria um tarball apontando para um `dist/` inexistente.

## 0.1.0 (2026-07-21)

- Client tipado gerado do OpenAPI oficial v0.0.10 (32 endpoints, hash pinado).
- Middleware dos 4 headers obrigatórios nos formatos exatos do Manual v1.0.
- Erros RFC 7807 tipados com headers operacionais expostos.
- `calcularSegregacao()`: fórmula de segregação em centavos inteiros (BigInt), truncamento para baixo.
- Tipos de domínio: categorias de valor, papéis de PSP, tributos.
