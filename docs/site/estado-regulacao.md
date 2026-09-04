---
title: Estado da regulação
---

# Estado da regulação

Este quadro mostra, em uma olhada, a superfície regulatória atual do Split Payment e da Reforma Tributária do Consumo que o splitbr acompanha: cada artefato oficial, sua versão vigente, a data e a fonte. Última verificação: 04/09/2026. As fontes são checadas toda segunda-feira, e as diferenças encontradas são registradas em [Novidades](/novidades).

As siglas do quadro: **IBS** (Imposto sobre Bens e Serviços) e **CBS** (Contribuição sobre Bens e Serviços) são os tributos novos da reforma; **CGIBS** é o Comitê Gestor do IBS; **NT** é Nota Técnica e **IT** é Informe Técnico do Portal NF-e; **PL** é Pacote de Liberação de esquemas XML.

> Projeto independente e não oficial, sem afiliação com a Receita Federal, o Comitê Gestor do IBS, o Serpro ou a Núclea. Nada aqui é aconselhamento jurídico nem tributário; a pilha legal completa está em [Base legal](/base-legal).

## Quadro de artefatos

| Artefato | Versão atual | Data | Fonte oficial |
|---|---|---|---|
| NT 2025.002 (leiaute NF-e/NFC-e para a Reforma Tributária do Consumo) | v1.51 | 04/08/2026 | [Portal NF-e, Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=) |
| IT 2025.002 (Informe Técnico, tabelas de classificação) | v1.60 | 23/06/2026 | [Portal NF-e, Informes Técnicos](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=) |
| NT 2026.004 (CNPJ alfanumérico) | v1.01 | 08/06/2026 | [Portal NF-e, Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=) |
| Pacote de Liberação de esquemas XML | PL 010f v1.04 | 31/08/2026 | [Portal NF-e, Esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=) |
| PL 010d (esquemas para CNPJ alfanumérico) | v1.03 | 10/07/2026 | [Portal NF-e, Esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=) |
| Esquema dos eventos RTC | era da NT 2025.002 v1.30 | atualizado em 2025 | [Portal NF-e, Esquemas XML](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=) |
| Calculadora de Tributos (ambiente de produção) | app 1.3.1, banco V0043 | 31/08/2026 | [Endpoint de versão dos dados abertos](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao) |
| OpenAPI da Plataforma de Split Payment | OAS 3.1, **v1.1.0**, 35 rotas | 24/08/2026 | [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment) |
| OpenAPI da Calculadora (produção) | OAS 3.1.0, 40 rotas | capturado em 04/09/2026 | [api-docs no portal](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs) |
| OpenAPI da Calculadora (piloto RTC) | OAS 3.1.0, 40 rotas | capturado em 04/09/2026 | [api-docs no piloto](https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs) |
| OpenAPI do Split Payment Simplificado (api-split) | OAS 3.1.0, 2 rotas | capturado em 20/07/2026 | [api-docs do api-split](https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api-split/api-docs) |
| Manual de Integração da Plataforma Pública de Split Payment | v1.1.0 | agosto/2026 | [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment) |
| Manual de Operações do Split Payment | minuta | jun/2026 | [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment) |
| Manual de Tempos do Split Payment | minuta | 15/07/2026 | [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment) |
| NT 2026.006 (vinculação NF-e x transação de split payment) | v1.00 | 25/08/2026 | [Portal NF-e, Notas Técnicas](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=) |
| IT 2026.001 (tabela de meios de pagamento) | v1.01 | 25/08/2026 | [Portal NF-e, Informes Técnicos](https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=) |
| Resolução CGIBS nº 6/2026 (regulamenta o IBS) | 6/2026 | 30/04/2026 | [PDF na CGIBS](https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf) |

A distribuição offline da Calculadora vendorada no repositório (componente `api-regime-geral` 1.2.4, banco V0039, obtida em 10/07/2026) está atrás da produção desde 31/08/2026. O `@splitbr/client` e o `@splitbr/mock` continuam gerados do OpenAPI **v0.0.10**, não do v1.1.0: a migração é uma quebra de contrato e está em aberto.

## O que ainda não existe

Em 04/09/2026, estes itens da família Split Payment ainda não foram publicados:

- **Manual de Redes**: não publicado. Esperado em [cgibs.gov.br](https://www.cgibs.gov.br/).
- **Manual de Segurança**: não publicado. Esperado em [cgibs.gov.br](https://www.cgibs.gov.br/).
- **Manual de Onboarding**: não publicado. Esperado em [cgibs.gov.br](https://www.cgibs.gov.br/).
- **Percentuais do Split Payment Simplificado**: ainda não definidos.

Além disso, o Manual de Operações (jun/2026) e o Manual de Tempos (15/07/2026) existem apenas como minuta. A publicação de qualquer um desses itens muda este quadro.

## Acompanhe as mudanças

Toda alteração em qualquer linha acima é registrada em [Novidades](/novidades), com data e o que mudou em relação à versão anterior.
