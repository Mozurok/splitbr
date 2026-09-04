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

## 2026-08-31: Calculadora vai para o banco V0043 e sai o Pacote de Liberação 010f

- O que mudou: o endpoint público de versão da Calculadora passou a responder `versaoApp` 1.3.1 e `versaoDb` V0043, datado de 31/08/2026, com a descrição oficial "Ajustes na vigência das tabelas CLASSIF_NBS_INDOP_LC e INDICADOR_OPERACAO_IBS_CBS". A referência anterior registrada aqui era o componente 1.2.4 com o banco V0039. No mesmo dia, o Portal NF-e publicou o Pacote de Liberação 010f (NT 2025.002 v1.50 e NT 2026.007 v1.00) e moveu o 010e v1.02 para a lista de versões em desuso.
- Impacto: quem roda a Calculadora offline está com as tabelas de vigência de NBS e de indicador de operação atrás da produção e deve reinstalar. Quem valida XML de NF-e ou NFC-e contra esquema precisa migrar do 010e v1.02 para o 010f.
- Fonte: [endpoint de versão da Calculadora](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao) e [Esquemas XML no Portal NF-e](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=)

## 2026-08-25: NT 2026.006 amarra a NF-e à transação de split payment

- O que mudou: o Portal NF-e publicou a NT 2026.006 v1.00, que cria o grupo YC na NF-e e NFC-e e o evento 110300, para vincular o documento fiscal à transação financeira sujeita ao split payment. No mesmo dia saiu o IT 2026.001 v1.01, com a tabela de meios de pagamento usada nessa vinculação. Implantação em homologação em 05/10/2026 e em produção em 03/11/2026.
- Impacto: é a peça que faltava entre a camada NF-e e a Plataforma Pública. Sem a vinculação não há como apurar corretamente o débito do fornecedor nem conceder o crédito ao adquirente, então quem emite nota e quem processa pagamento passam a compartilhar um contrato comum.
- Fonte: [Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=) e [Informes Técnicos](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=) no Portal NF-e

## 2026-08-24: contrato da Plataforma Pública vai para a v1.1.0 e quebra o v0.0.10

- O que mudou: o CGIBS publicou o OpenAPI **v1.1.0** da Plataforma Pública de Split Payment junto com o Manual de Integração v1.1.0, e moveu o v0.0.10 para "versões anteriores". A mudança quebra o contrato: as 12 rotas de stream trocaram `{idPsp}/tributos` por `{cnpjRaizPspRecDir}/transacoes`, entraram três rotas do Mecanismo de Ocorrências (`/api/v1/moc/*`), o header `X-JWS-Signature` passou a ser obrigatório nas 43 operações e os schemas foram de 57 para 78, com 33 dos 55 comuns alterados. O manual acrescenta ainda que o Informe de Transação Atualizada perdeu o Pix Automático, que `numCodBarras` ficou fixo em 44 caracteres e que `dtHrRepasse` ganhou prazo-limite de envio.
- Impacto: quem integra a plataforma real precisa migrar. O `@splitbr/client` e o `@splitbr/mock` continuam gerados do v0.0.10 e, portanto, implementam o contrato anterior; o v1.1.0 já está vendorado no repositório, mas a migração é um major bump nos dois pacotes e ainda está em aberto.
- Fonte: [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment)

## 2026-08-04: NT 2025.002 sai para a v1.51

- O que mudou: a NT 2025.002 chegou à versão 1.51, com alteração de regras de validação (entre elas UB13-30, UB13-40, UB18-10, UB22-20 e VC02-30) e mudança no cronograma de implantação da UB12-10. A v1.50, de 03/06/2026, saiu da lista de documentos vigentes. A aprovação veio pelo Ato Técnico Conjunto RFB/CGIBS nº 1, de 31/07/2026, um veículo novo: as notas técnicas de Reforma Tributária passaram a ser formalmente aprovadas por esse tipo de ato.
- Impacto: quem valida NF-e contra as regras da NT precisa conferir a lista de validações alteradas antes das datas de corte de 01/09/2026 e 05/10/2026.
- Fonte: [Notas Técnicas no Portal NF-e](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=)

## 2026-08-03: piloto da Calculadora converge para a produção; divergência do `cTribNac` acabou

- O que mudou: no contrato do piloto, o campo `cTribNac` passou a aceitar só 4 dígitos (`^\d{4}$`), igual ao da produção, e a descrição do campo acompanhou. A divergência registrada aqui em 20/07/2026 deixou de existir, e na direção contrária à esperada: o piloto recuou para o comportamento da produção em vez de antecipar uma mudança dela. O contrato do piloto foi re-capturado e re-pinado no registro do splitbr.
- Impacto: quem tratava o piloto como prévia de uma flexibilização do `cTribNac` não tem mais essa expectativa para observar; produção e piloto agora dizem a mesma coisa nesse campo. Nenhuma mudança nos pacotes `@splitbr/client` e `@splitbr/mock`, que são gerados de outro contrato.
- Fonte: https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs e https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs

## 2026-07-20: OpenAPIs da Calculadora e do Split Simplificado capturados; divergência piloto vs portal

- O que mudou: foram capturados e pinados no registro do splitbr (20/07/2026) os contratos OpenAPI da Calculadora de Tributos (produção e piloto, OAS 3.1.0, 36 rotas cada) e, pela primeira vez, o do Split Payment Simplificado (api-split, OAS 3.1.0, 2 rotas). Uma divergência de contrato entre piloto e produção foi documentada: no piloto, o campo `cTribNac` aceita 4 ou 6 dígitos; na produção (portal), só 4.
- Impacto: a produção é a referência estável para o codegen; o piloto antecipa mudanças. Os percentuais do split simplificado seguem indefinidos oficialmente.
- Fonte: https://consumo.tributos.gov.br/ (api-docs da Calculadora e do api-split)
- Atualização: a divergência do `cTribNac` descrita acima acabou em 03/08/2026, quando o piloto convergiu para a produção. Veja a entrada de 2026-08-03.

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
