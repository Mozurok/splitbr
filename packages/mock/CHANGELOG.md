# Changelog

## 0.1.0 (nao publicado; publicacao no momento do lancamento)

- Mock local da Plataforma Publica do Split Payment (spec oficial OAS v0.0.10, pinado por hash).
- Sete fluxos: Transacao Iniciada/Atualizada/Baixa, Informe Preliminar (6 arranjos), Segregacao em 3 passos, Retorno Super Inteligente e Consulta Retroativa (long polling com token de posicao).
- Matrizes M/O/N-E das secoes 3.1-3.6 do manual como dados (data/matrices/).
- Rejeicao integral de lote e cross-validacao da finalizacao em centavos inteiros.
- Chaos flags (429, 503 + circuit headers, 500, 504, variantes 401, 403) e motor de cenarios RSUPxxx com os dois procedimentos de calculo (padrao e simplificado).
- Stub da consulta por ResourceId atras de flag.
- CLI (splitbr-mock) e imagem Docker multi-stage (node:24-slim).
