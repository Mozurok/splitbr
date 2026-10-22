---
title: Base legal
---

# Base legal

O split payment não nasce de uma lei só. Ele desce por uma pilha: a Emenda Constitucional 132/2023 cria o IBS (Imposto sobre Bens e Serviços) e a CBS (Contribuição sobre Bens e Serviços) na Constituição; a Lei Complementar 214/2025 institui esses tributos e o próprio split, com ajustes da LC 227/2026; o Decreto 12.955/2026 (lado CBS) e a Resolução CGIBS 6/2026 (lado IBS) regulamentam o funcionamento; e por fim os atos conjuntos infralegais operacionalizam a plataforma e publicam os manuais técnicos. Cada camada só vale dentro do que a camada de cima autoriza. Esta página percorre a pilha nessa ordem.

::: warning Cronograma fluido, e isto não é aconselhamento jurídico
As datas de entrada em vigor do split payment divergem entre fontes e mudam com frequência. Tudo nesta página deriva de documentos oficiais públicos cujo comportamento e cronograma podem mudar. O splitbr é um projeto independente e não oficial, sem afiliação com a Receita Federal, o Comitê Gestor do IBS, o Serpro ou a Núclea. Nada aqui é aconselhamento jurídico nem tributário: antes de construir ou decidir, confira a fonte primária.
:::

## EC 132/2023 (Emenda Constitucional)

A emenda da Reforma Tributária do Consumo: altera a Constituição para criar o IBS e a CBS, os tributos que substituem ICMS, ISS, PIS e Cofins.

Para o split payment, é o fundamento de tudo. Sem a emenda não existem os tributos que o split segrega na liquidação financeira.

Texto oficial: [EC 132/2023 (Planalto)](https://www.planalto.gov.br/ccivil_03/constituicao/emendas/emc/emc132.htm)

## LC 214/2025

A lei complementar que institui o IBS, a CBS e o Imposto Seletivo, com as regras gerais dos novos tributos.

É aqui que o split payment existe como obrigação legal:

- **Arts. 31 a 36**: o split em si. Definem a segregação e o recolhimento dos tributos no momento da liquidação financeira da transação.
- **Art. 48**: o vínculo de crédito, a ligação entre o pagamento realizado e o crédito de tributo que o adquirente pode apropriar.
- **Art. 348**: o cronograma próprio de transição do Simples Nacional (incluindo o MEI) para o novo regime.

Texto oficial: [LC 214/2025 (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp214.htm)

## LC 227/2026

Lei complementar que ajusta a LC 214/2025 em pontos que a prática revelou incompletos.

Para o split payment, o ponto central é o reembolso em caso de cancelamento da transação: o que acontece com o tributo já segregado quando a operação é desfeita.

Texto oficial: [LC 227/2026 (Planalto)](https://www.planalto.gov.br/ccivil_03/leis/lcp/Lcp227.htm)

## Decreto 12.955/2026

O regulamento da CBS: o decreto da União que detalha como a lei complementar opera no lado federal.

Para o split payment, os **arts. 26 a 36** são o núcleo: definem os arranjos de pagamento alcançados, os fluxos de contingência e as responsabilidades dos PSPs (prestadores de serviços de pagamento). O **art. 30** trata do procedimento simplificado de split. Os percentuais desse procedimento simplificado ainda não estão definidos oficialmente (jul/2026), então nenhum número que você encontrar por aí deve ser tratado como final.

Texto oficial: [Decreto 12.955/2026 (Planalto)](https://www.planalto.gov.br/ccivil_03/_ato2023-2026/2026/decreto/d12955.htm)

## Resolução CGIBS 6/2026

A regulamentação do IBS editada pelo Comitê Gestor do IBS (CGIBS).

Para o split payment, é o espelho do Decreto 12.955 do lado do IBS: o que o decreto regulamenta para a CBS (tributo federal), a resolução regulamenta para o IBS (tributo de estados e municípios).

Texto oficial: [Resolução CGIBS 6/2026 (PDF, CGIBS)](https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf)

## Atos operacionais: Portaria Conjunta MF/CGIBS 7/2026 e Ato Conjunto RFB/CGIBS 2/2026

Os atos infralegais que operacionalizam o split payment na prática e publicaram o Manual de Integração da Plataforma Pública de Split Payment.

Esses dois atos não têm URL permanente própria. Para acompanhá-los, use o [CGIBS](https://www.cgibs.gov.br/) e as [notícias da RFB](https://www.gov.br/receitafederal/pt-br/assuntos/noticias).

## Atos Técnicos Conjuntos RFB/CGIBS 4/2026 e 5/2026

A documentação técnica do split payment passou a ser aprovada formalmente por **Ato Técnico Conjunto** da RFB com o CGIBS, com base na Resolução CGIBS 17/2026. O **nº 4** (28/08/2026) aprova o Manual de Habilitação de Participantes e o Manual de Redes. O **nº 5** (22/09/2026) aprova o pacote publicado em 24/09: Manuais de Operações, Integração, Tempos, Redes e Segurança e o OpenAPI v1.1.1. O nº 5 também reserva o terceiro dígito da versão (X.Y.**Z**) para correções materiais e redacionais.

Texto oficial: [Atos Técnicos Conjuntos no CGIBS](https://www.cgibs.gov.br/atos-tecnicos-conjuntos)

## Quem é alcançado

Dois fatos do contrato da Plataforma (OpenAPI v1.1.1) e um da lei ajudam a situar quem entra nesse fluxo:

- **O recebedor é sempre CNPJ.** O campo `cnpjRec` identifica quem recebe o valor líquido da transação e só aceita CNPJ (14 caracteres alfanuméricos). É o contribuinte do regime regular.
- **CPF aparece apenas como pagador efetivo.** O campo `cnpjCpfPagEfet`, de quem de fato pagou, aceita CPF de 11 dígitos ou CNPJ. Já o pagador informado na emissão (`cnpjPagOrig`) só aceita CNPJ desde a v1.1.0 do contrato. Ou seja: pessoa física pode pagar, mas não recebe via split.
- **Simples Nacional e MEI têm cronograma próprio**, definido no art. 348 da LC 214/2025, e não entram no mesmo ritmo do regime regular.

## O que ainda não foi publicado

A família documental do Split Payment, pela tabela do capítulo 1 do Manual de Integração v1.1.1, tem sete documentos: os Manuais de Operações, Integração (com o OpenAPI), Tempos, Redes, Segurança e Habilitação de Participantes, mais o Plano de Implantação. Em 24/09/2026 o CGIBS publicou os seis manuais, aprovados pelo Ato Técnico Conjunto RFB/CGIBS nº 5: Operações e Tempos saíram da minuta na v1.0.1, a Integração foi para a v1.1.1, e Redes, Segurança e Habilitação (antes chamado de Manual de Onboarding) saíram pela primeira vez. Falta o Plano de Implantação, que traz o cronograma e os prazos de envio dos formulários. Acompanhe a [página do Split Payment no CGIBS](https://www.cgibs.gov.br/split-payment) para as próximas publicações.

## Para ir além

Esta página cobre só o mapa legal. A lista curada completa, com a camada NF-e, a Calculadora de Tributos, as APIs do split simplificado e o ecossistema open source, vive no [awesome-split-payment](https://github.com/Mozurok/awesome-split-payment), mantido pelo mesmo autor do splitbr.
