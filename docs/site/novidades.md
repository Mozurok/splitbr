---
title: Novidades
---

<!--
Contrato de entrada (fixo; siga este formato ao editar):

## AAAA-MM-DD: <o que saiu>

seguido de 2 a 4 linhas: o que mudou, impacto em uma frase, link da fonte oficial.
Ordem: mais recente primeiro. Semana sem mudança não gera entrada.
-->

# Novidades

Registro, em ordem cronológica inversa, das mudanças oficiais que afetam o Split Payment e a Reforma Tributária do Consumo: notas técnicas e informes do Portal NF-e, manuais e resoluções do Comitê Gestor do IBS (CGIBS), publicações da Receita Federal e versões da Calculadora de Tributos. Fontes oficiais verificadas toda segunda-feira às 9h (horário de Brasília); semanas sem mudança não geram entrada.

## 2026-07-20: OpenAPIs da Calculadora e do Split Simplificado capturados; divergência piloto vs portal

- O que mudou: foram capturados e pinados no registro do splitbr (20/07/2026) os contratos OpenAPI da Calculadora de Tributos (produção e piloto, OAS 3.1.0, 36 rotas cada) e, pela primeira vez, o do Split Payment Simplificado (api-split, OAS 3.1.0, 2 rotas). Uma divergência de contrato entre piloto e produção foi documentada: no piloto, o campo `cTribNac` aceita 4 ou 6 dígitos; na produção (portal), só 4.
- Impacto: a produção é a referência estável para o codegen; o piloto antecipa mudanças. Os percentuais do split simplificado seguem indefinidos oficialmente.
- Fonte: https://consumo.tributos.gov.br/ (api-docs da Calculadora e do api-split)

## 2026-07-19: Manual de Integração v1.0 e contrato OpenAPI da API de Split verificados

- O que mudou: o Manual de Integração da Plataforma Pública de Split Payment (v1.0) e o contrato OpenAPI da API (v0.0.10) foram verificados e pinados no registro do splitbr em 19/07/2026; ambos estão no portal de serviços da Receita, menu Manuais.
- Impacto: são a fonte primária que o client e o mock do splitbr seguem (headers obrigatórios, formatos de campo, contrato da API).
- Fonte: https://consumo.tributos.gov.br/ (menu Manuais)

## 2026-07-19: Minuta do Manual de Operações do Split Payment verificada

- O que mudou: a versão preliminar (minuta datada de jun/2026) do Manual de Operações do Split Payment, publicada nos arquivos da CGIBS, foi verificada e pinada no registro do splitbr em 19/07/2026.
- Impacto: ainda é minuta, então detalhes operacionais (como a semântica dos códigos de retorno) só ficam definitivos na versão final.
- Fonte: https://www.cgibs.gov.br/

## 2026-07-10: Novos pacotes de esquemas XML: PL 010e v1.02 e PL 010d v1.03

- O que mudou: o Portal NF-e publicou o Pacote de Liberação 010e v1.02 (incorpora a NT 2025.002 v1.40 e as NT 2026.002/003) e o PL 010d v1.03 (CNPJ alfanumérico, NT 2026.004 v1.01).
- Impacto: quem valida XML de NF-e/NFC-e contra esquema precisa atualizar para os pacotes novos.
- Fonte: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=

## 2026-07-10: Calculadora de Tributos: componente api-regime-geral 1.2.4

- O que mudou: a distribuição offline da Calculadora (JAR, imagem Docker e código-fonte) traz o componente api-regime-geral na versão 1.2.4, com o banco normativo embutido (distribuição obtida em 10/07/2026).
- Impacto: instalações locais devem conferir a versão corrente no endpoint público de versão antes de confiar nas tabelas embutidas.
- Fonte: https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/calculadora-offline

## 2026-06-23: IT 2025.002 atualizado para v1.60

- O que mudou: o Informe Técnico 2025.002 chegou à v1.60, incorporando a atualização das tabelas de classificação tributária publicada em 23/06/2026.
- Impacto: validações que usam as tabelas do IT (CST x cClassTrib) devem migrar para a v1.60.
- Fonte: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=

## 2026-06-03: NT 2025.002 chega à v1.50

- O que mudou: a Nota Técnica 2025.002 (Reforma Tributária do Consumo na NF-e/NFC-e) foi atualizada para a v1.50 em 03/06/2026, a versão corrente.
- Impacto: emissores e integradores devem conferir o histórico de alterações da NT antes de fechar layouts; a baseline vendorizada do splitbr acompanha a v1.50.
- Fonte: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
