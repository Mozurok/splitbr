# Changelog

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
