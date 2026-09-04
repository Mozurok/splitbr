# Changelog

## 0.2.0 (2026-09-04)

**Quebra compatibilidade.** Serve o contrato oficial **OpenAPI v1.1.0**, publicado pelo CGIBS em 24/08/2026. Veja o [guia de migração](https://mozurok.github.io/splitbr/migracao).

- Spec embarcado e trava de hash agora são do v1.1.0: 35 rotas.
- **Mecanismo de Ocorrências (3.9)**: três rotas novas (`POST /api/v1/moc/solicitacao`, `POST /api/v1/moc/notificacao`, `GET /api/v1/moc/{cnpjRaizPspRecDir}/ocorrencias`), com resposta simulada determinística da RFB/CGIBS, para o ciclo fechar sem a plataforma real.
- **Assinatura `X-JWS-Signature`**: o mock confere a forma do protected header quando ele vem, e não exige que venha, para `npx splitbr-mock` seguir utilizável sem par de chaves. `buildServer({ exigirAssinatura: true })` liga o comportamento fiel ao contrato.
- **Os quatro headers antigos deixaram de ser exigidos.** Continuam aceitos, e o `correlationId` continua ecoado na resposta.
- As 12 rotas de stream mudaram de caminho: `{idPsp}/tributos` virou `{cnpjRaizPspRecDir}/transacoes`. A chave do corpo de resposta acompanhou (`tributos` para `transacoes`), e a consulta retroativa troca `fromNsu`/`toNsu` por `nsuInicial`/`nsuFinal`.
- `dtHrDisp` passa a ser emitido no Retorno Super Inteligente; `nsuId` sai como string.
- Matrizes M/O/N-E atualizadas para os campos renomeados. O MOC não ganhou matriz de propósito: o próprio spec já codifica a regra por arranjo com `oneOf`, `required` e `additionalProperties: false`, e duplicar isso criaria duas fontes da verdade.

## 0.1.1 (2026-09-04)

Release de vigilância: nenhuma mudança de comportamento, de rotas ou de dados. O que muda é o que o pacote diz sobre si.

- Aviso no README: o contrato oficial da Plataforma saiu para a **v1.1.0** em 24/08/2026 e este mock continua reproduzindo a v0.0.10. A v1.1.0 renomeia as 12 rotas de stream, acrescenta 3 rotas do Mecanismo de Ocorrências, torna `X-JWS-Signature` obrigatório e retira o Pix Automático do Informe de Transação Atualizada. O mock segue fiel à v0.0.10 e continua servindo para aprender o mecanismo; a migração é um major bump e está em aberto.
- `prepublishOnly` roda build, typecheck e testes antes de publicar.

## 0.1.0 (2026-07-21)

- Mock local da Plataforma Publica do Split Payment (spec oficial OAS v0.0.10, pinado por hash).
- Sete fluxos: Transacao Iniciada/Atualizada/Baixa, Informe Preliminar (6 arranjos), Segregacao em 3 passos, Retorno Super Inteligente e Consulta Retroativa (long polling com token de posicao).
- Matrizes M/O/N-E das secoes 3.1-3.6 do manual como dados (data/matrices/).
- Rejeicao integral de lote e cross-validacao da finalizacao em centavos inteiros.
- Chaos flags (429, 503 + circuit headers, 500, 504, variantes 401, 403) e motor de cenarios RSUPxxx com os dois procedimentos de calculo (padrao e simplificado).
- Stub da consulta por ResourceId atras de flag.
- CLI (splitbr-mock) e imagem Docker multi-stage (node:24-slim).
