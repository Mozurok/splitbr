# vendor/ MANIFEST

Pinned inventory of vendored official artifacts. Every file in vendor/ (except this manifest) must have a row. Verify with: recompute SHA-256 per file and diff against the rows. Maintained by the Fhorja task flow (bmazurok__splitbr); update on every vendor change.

Conventions: `Retrieved` is the date the artifact was obtained from its source. `[to be confirmed]` marks a source URL to pin down during P0 (Slice 2 or Slice 4). Calculadora artifacts: license `[unknown yet]`, pending Slice 4; do not redistribute or commit them publicly until that resolves.

When a file carries more than one row, the row with the latest `Retrieved` date is the pinned one; the earlier rows stay as history. Rows are never overwritten or deleted, so a re-vendoring is always readable as a before and after from this file alone, without consulting git history.

## swagger/

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| swagger/openapi-v0_0_10.json | OAS 3.1, API v0.0.10, 32 paths, 57 schemas (SUPERSEDIDO pelo v1.1.0 em 24/08/2026; gerou os pacotes ate a versao 0.1.1) | https://www.cgibs.gov.br/upload/arquivos/202606/03172158-openapi-v0-0-10.zip (URL confirmada em 2026-09-04: o zip baixa sem login e o JSON dentro dele e byte-identico a este hash; listado em https://www.cgibs.gov.br/split-payment sob "Versoes anteriores") | 2026-07-19 | c5f60c849b22149d90ac2e3df6fcbe3ff9b0fb1f0c8b6463622fabb415629e2b |
| swagger/calculadora-openapi.portal.json | OAS 3.1.0, info.version v0, 36 paths | https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs | 2026-07-20 | fc821c94dcfc3efebdddbbe033a0cdaeb0041a210e12111c169af7f452918c36 |
| swagger/calculadora-openapi.piloto.json | OAS 3.1.0, info.version v0, 36 paths | https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs | 2026-07-20 | 7483d0029c985c46da901509977a1f4644e172d27168d4c53421202b468464be |
| swagger/calculadora-openapi.piloto.json | OAS 3.1.0, info.version v0, 36 paths (re-vendorado apos o drift da issue #1; PINADO) | https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs | 2026-08-03 | 1ce6a0cb9a695669f751f9ab76d9068b4e82fbdd9df202d9fc61b58cd4b17ae0 |
| swagger/calculadora-openapi.local.json | OAS 3.1.0, info.version v0, 37 paths (component api-regime-geral 1.2.4 via Docker) | http://localhost:18080/api/api-docs (container from calculadora/calculadora.tar.gz) | 2026-07-20 | 957593b74a81109fa66acfe570ab875225e620facf60f13258042220a075cf35 |
| swagger/api-split-openapi.portal.json | OAS 3.1.0, info.version v0, 2 paths (Split Payment Simplificado) | https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api-split/api-docs | 2026-07-20 | 82c95912c1aed19ae77059a0b99afa42eb2f868bb198e9b9a74bf23581c9be42 |
| swagger/api-split-openapi.local.json | OAS 3.1.0, info.version v0, 2 paths (api-split-payment-simplificado.jar via Docker, :8081/api) | http://localhost:18081/api/api-docs (container from calculadora/calculadora.tar.gz) | 2026-07-20 | 43ca11b929d01abecf4b249c4351cf56383ce5deaeda025135071bf5f43954d9 |
| swagger/openapi-v1_1_0.json | OAS 3.1, API v1.1.0, 35 paths, 78 schemas (contrato corrente da Plataforma; ALIMENTA o codegen desde @splitbr/client 0.2.0) | https://www.cgibs.gov.br/upload/arquivos/202608/24154448-openapi-v1-1-0.zip (listado em https://www.cgibs.gov.br/split-payment sob "Manual de Integracao - Versao atual") | 2026-09-04 | 1a14b04e7e910b31c14913908ae6a8ce050d5b27afc2cee844a44959ee1621e7 |
| swagger/calculadora-openapi.portal.json | OAS 3.1.0, info.version v0, 40 paths, 82 schemas (re-vendorado apos o drift da issue #6; PINADO) | https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs | 2026-09-04 | ac750153380b873185423a55f525748bbb15844ec93b600c6e1a8ae3d3ab58c5 |
| swagger/calculadora-openapi.piloto.json | OAS 3.1.0, info.version v0, 40 paths, 82 schemas (re-vendorado junto com o portal; PINADO) | https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs | 2026-09-04 | c86c47d3be7bbbe32fe70c69ac5fa3cf5613628b5175ac4455f477774c10aefa |
| cgibs-split-payment-artefatos.json | Inventario dos 6 artefatos linkados na pagina oficial do Split Payment no CGIBS; alvo do quarto check de drift | https://www.cgibs.gov.br/split-payment (derivado: extracao dos links /upload/arquivos/) | 2026-09-04 | 9c101d0def12d2bc0f48e6c4ffa14d2803786dcfd1b613f32dafcc3937977638 |

Contract diff note (2026-07-20) **[SUPERSEDIDA em 2026-08-03, veja a nota abaixo; mantida como registro do que era verdade naquela data]**: portal and piloto share the same 36-path set but differ in content: piloto's cTribNac accepts 4 or 6 digits (`^\d{4}$|^\d{6}$`) while portal accepts only 4 (`^\d{4}$`), plus example-formatting differences; per the brief, prefer portal as the stable codegen reference and read piloto as change-anticipation.

Contract diff note (2026-08-03) **[SUPERSEDIDA em 2026-09-04, veja a nota abaixo; mantida como registro do que era verdade naquela data]**: o piloto **convergiu para o portal**. O `cTribNac` do piloto agora aceita só 4 dígitos (`^\d{4}$`), igual ao portal, e a descrição do campo mudou junto ("4 ou 6 dígitos" virou "4 dígitos"). Ou seja, a divergência descrita na nota de 2026-07-20 deixou de existir, e na direção oposta à esperada: o piloto recuou para o comportamento do portal em vez de anteceder uma mudança dele. Portal e api-split seguem inalterados (verificado ao vivo em 2026-08-03). Uma segunda diferença apareceu no mesmo intervalo: no exemplo `Transferências CBS Example` de `/calculadora/dados-abertos/transferencias-cbs`, o valor deixou de ser um array JSON e virou uma string contendo JSON, e essa string tem vírgula sobrando, então não é JSON válido. É regressão de autoria upstream num exemplo, não mudança de schema, e não afeta geração de código. Detectado pelo workflow semanal (issue #1, run 30274464570). Local (1.2.4) adds `/versao/status` and has further minor diffs vs portal. Nota de hash (vale para portal, piloto e api-split): the hosted spec's `servers[0].url` stamps the responding backend instance's port (observed :11088 then :11011 an hour apart, e :11202 -> :6069 na captura de 2026-09-04), so its byte hash is capture-specific; por isso o `drift-check.mjs` compara conteudo normalizado sem o bloco `servers` da raiz, e nunca hash de bytes; the local api-split spec is content-identical to the portal one after removing the servers block.

Contract diff note (2026-09-04, ATUAL): **o contrato da Plataforma Publica saiu do v0.0.10 para o v1.1.0**, publicado no CGIBS em 24/08/2026 e pareado com o Manual de Integracao v1.1.0. A mudanca quebra o contrato: as 12 rotas de stream trocaram `{idPsp}/tributos` por `{cnpjRaizPspRecDir}/transacoes`, entraram 3 rotas do Mecanismo de Ocorrencias (`/api/v1/moc/notificacao`, `/api/v1/moc/solicitacao`, `/api/v1/moc/{cnpjRaizPspRecDir}/ocorrencias`), os schemas foram de 57 para 78 com 33 dos 55 compartilhados alterados, e o header `X-JWS-Signature` passou a ser `required: true` nas 43 operacoes. O v1.1.0 esta vendorado aqui como arquivo NOVO e **alimenta o codegen desde a versao 0.2.0** dos dois pacotes; o v0.0.10 fica como historico do que gerou ate a 0.1.1. Na familia Calculadora, o portal divergiu (issue #6, aberta em 2026-08-31) e foi re-vendorado: 36 -> 40 rotas, com `/calculadora/nfse/local-operacao` trocando o campo unico `localOperacao` por `codigoLocalFornecimento`/`localFornecimento`/`codigoLocalIncidencia`/`localIncidencia`, e `/calculadora/nfse/indicador-operacao` apontando para um schema proprio (`NfseIndicadorOperacaoOutput`). A Calculadora de producao esta em app 1.3.1-0e46e51f e banco V0043 (31/08/2026), contra o 1.2.4 / V0039 da distribuicao offline vendorada em vendor/calculadora/.

Aviso de coleta (2026-09-04): o `api-docs` do **piloto** passou a responder um desafio anti-bot (F5 Shape/TSPD, HTML com `window["bobcmn"]`) com HTTP 200 no lugar do JSON, ao menos sob requisicoes repetidas. O `curl` toma o desafio; o `fetch` do Node (undici) passa, provavelmente por fingerprint TLS diferente, e foi por ele que a captura saiu. Quem for recapturar a mao pelo curl vai concluir por engano que o piloto esta fora do ar. Um coletor que so olhe o status code trata esse HTML como sucesso; o `drift-check.mjs` cobre isso classificando resposta nao-JSON como `malformed`.

## manual/

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| manual/manual-de-integracao-plataforma-publica-de-split-payment-v1.pdf | v1.0 | consumo.tributos.gov.br > menu > Manuais [exact URL to be confirmed] | 2026-07-19 | c45ae4101fd140c76efb571810cc1eee67dcd525f7f15942401adfa065dda157 |
| manual/manual-de-integracao-plataforma-publica-de-split-payment-v1.txt | derived from the PDF above (pdftotext -layout) | local extraction | 2026-07-20 | fb38ba1c04de2716c35b64a0c7c6c0cd6f0b2a143b087b19f0b84904aa94dbb7 |
| manual/30145925-minuta-split-payment-manual-de-operacoes.pdf | minuta Jun/2026 | cgibs.gov.br uploads [exact URL to be confirmed] | 2026-07-19 | c6ef3adb63981864a637fbcc1198d2956a6ba44866c8cb4000da7f07ccd59b18 |
| manual/30145925-minuta-split-payment-manual-de-operacoes.txt | derived from the PDF above (pdftotext -layout) | local extraction | 2026-07-20 | 1463d1def6f45a732e9602e0371c8f97c8cdff0bc3b49649c26d82af0ccf925d |
| manual/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf | Resolucao CGIBS 6/2026 (30/04/2026) | https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf | 2026-07-19 | 9ed7032ef9c25bbee51bdb5e90f60e1ad01a2bf56cb41a28221c3db7f61d419a |
| manual/manual-de-integracao-plataforma-publica-split-payment-v1.1.0.pdf | v1.1.0 (Agosto/2026; historico interno: 1.0.0 em 03/06/2026, 1.1.0 em 30/07/2026). SUBSTITUI o v1.0 vendorado. Novo: 3.9 Mecanismo de Ocorrencias (MOC), 8. Headers Padrao (X-JWS-Signature), 9. Rastreabilidade | https://www.cgibs.gov.br/upload/arquivos/202608/24154349-20260811-manual-de-integracao-plataforma-publica-split-payment-revisao-fin.pdf | 2026-09-04 | 3ca73ab4af01708ea9a50f074a4d9f96eb0594c4184dcd98714cdd3b45257afc |
| manual/manual-de-integracao-plataforma-publica-split-payment-v1.1.0.txt | derived from the PDF above (pdftotext -layout) | local extraction | 2026-09-04 | b032f9c8b5a2f9853e0d423edae8c63894bb6f5fddb23dbb07eb655fada1bf69 |
| manual/20260715-split-payment-manual-de-tempos-minuta.docx | Manual de Tempos, minuta datada 15/07/2026 (upload 20/07/2026). ANS, janelas operacionais, prazos de repasse D+N, IGA e Mecanismo de Ocorrencias | https://www.cgibs.gov.br/upload/arquivos/202607/20150141-20260715-fin-split-payment-manual-de-tempos-minuta.docx | 2026-09-04 | 1dd0cd65c6fd5805a39c0ba2d929934d290ef115ff27eec05dd07f3d42635cb6 |

## nt/

Captura de 2026-08-03 (D-5 da task drift-detector-hardening): dois artefatos publicados depois da baseline de 2026-07-20 foram vendorados, o pacote de esquemas de eventos RTC da NT 2025.002 v1.40 (27/07/2026) e a NT 2026.001 v1.02b (31/07/2026, PAA). Seguem CURRENT e inalterados desde a baseline: NT 2025.002 v1.50, IT 2025.002 v1.60, PL 010e v1.02, PL 010d v1.03.

Captura de 2026-09-04: quatro artefatos publicados depois da captura de 2026-08-03 foram vendorados: NT 2025.002 v1.51 (04/08/2026, substitui a v1.50), NT 2026.006 v1.00 (25/08/2026, vinculacao NF-e x transacao de split payment, grupo YC e evento 110300), IT 2026.001 v1.01 (25/08/2026, tabela de meios de pagamento) e o Pacote de Liberacao 010f v1.04 (31/08/2026, que empurrou o 010e v1.02 para "em desuso" no portal). Novidade de processo: as NTs e ITs de RTC passaram a ser aprovadas formalmente por **Ato Tecnico Conjunto RFB/CGIBS** (n. 1 de 31/07/2026 e n. 2 de 21/08/2026), um veiculo que a baseline anterior nao conhecia; a Resolucao CGIBS 17 e a que o habilita, e a serie de resolucoes ja vai da 7 a 17 sem estar inventariada aqui.

**Backlog conhecido, deliberadamente NAO vendorado nesta captura** (anterior a baseline, portanto lacuna de cobertura e nao drift; registrado aqui em vez de ficar silencioso): NT 2026.002 v1.00 e NT 2026.003 v1.00 (ambas de 25/05/2026, DANFE Simplificado Tipo 2 e Operacoes, assuntos fora do Split Payment) e o Pacote de Liberacao Distribuicao de DF-e v1.04 (03/07/2026). Vendorar quando algum deles passar a importar para o escopo do projeto.

Aviso de coleta: os links `exibirArquivo.aspx?conteudo=<token>` do portal podem conter espaco no token (visto em 2026-08-03: `conteudo=kp0SXLu ZdI=`). Um extrator que corta no primeiro espaco produz URL errada em silencio; codifique o espaco como `%20` ou `%2B` (os dois retornam o mesmo arquivo). O portal tambem exige user-agent de navegador e cookie jar, senao devolve 302.

All downloaded 2026-07-20 directly from the Portal NF-e via `exibirArquivo.aspx?conteudo=<token>` links on three listings: Notas Tecnicas (tipoConteudo=04BIflQt1aY=), Esquemas XML (tipoConteudo=BMPFMBoln3w=), Informes Tecnicos (tipoConteudo=hXzemuyNHW4=). Version notes vs plan: IT 2025.002 current is v1.60 (23/06/2026, matches the pending-table date the CFC deck announced; v1.50 kept for diffing, byte-identical to the previously scratchpad-held TOTVS mirror); latest NF-e/NFC-e schema package is 010e_v1.02 (10/07/2026), newer than the brief's 010b (also kept as baseline).

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| nt/nt-2025-002-v1.00.pdf | NT 2025.002 v1.00 (28/03/2025) | Portal NF-e NT listing | 2026-07-20 | 9cc98312d525f7a2002ccd09c2cd239329f23818e35a65d871004df9ae4eba18 |
| nt/nt-2025-002-v1.01.pdf | NT 2025.002 v1.01 (15/04/2025) | Portal NF-e NT listing | 2026-07-20 | 373f75232f9d8989173beed2d830e8a1831480595d27f474f90747dd0466418e |
| nt/nt-2025-002-v1.10.pdf | NT 2025.002 v1.10 (09/06/2025) | Portal NF-e NT listing | 2026-07-20 | bdc8a10e5f0eb3f598b14dcc5bd8039cdb964aea69dfb56bfdabc25749faa255 |
| nt/nt-2025-002-v1.20.pdf | NT 2025.002 v1.20 (30/07/2025) | Portal NF-e NT listing | 2026-07-20 | cb42d9fd2b9e08b1115170fa7372987c849256584698f8b27493219a54282366 |
| nt/nt-2025-002-v1.30.pdf | NT 2025.002 v1.30 (03/10/2025) | Portal NF-e NT listing | 2026-07-20 | 9ed8761fd2b6375e76a19be20a86aa8a64f88849b20683b605c7c1a71d3b93e0 |
| nt/nt-2025-002-v1.31.pdf | NT 2025.002 v1.31 (11/11/2025) | Portal NF-e NT listing | 2026-07-20 | 02a5b447c0387c134cca6a3c382fd642e0a5d4fd56115072f175d56ebcf0c028 |
| nt/nt-2025-002-v1.32.pdf | NT 2025.002 v1.32 (25/11/2025) | Portal NF-e NT listing | 2026-07-20 | da88e32ba94f88ddbed1d17e0c6c82bf0014034036bfc2e2d642dc624aa1e73f |
| nt/nt-2025-002-v1.33.pdf | NT 2025.002 v1.33 (02/12/2025) | Portal NF-e NT listing | 2026-07-20 | b11b09d3bb8b0d6813e3346532b7d4ac436480e060d2f1b43226bc2de2e1765a |
| nt/nt-2025-002-v1.34.pdf | NT 2025.002 v1.34 (04/12/2025) | Portal NF-e NT listing | 2026-07-20 | daf22d54b2a36296bdd6153228777479c0f069f8e2d7d283145233eea4e6b132 |
| nt/nt-2025-002-v1.35.pdf | NT 2025.002 v1.35 (31/03/2026) | Portal NF-e NT listing | 2026-07-20 | ce99aac12f51af5ebfaa46565f5bce1de90f852d079ce0f98a367e6badb108d7 |
| nt/nt-2025-002-v1.36.pdf | NT 2025.002 v1.36 (30/04/2026) | Portal NF-e NT listing | 2026-07-20 | 5a11a96dccb7ee0cc7c3f71f5b05863b9f2c2a0b77d64ab831381da5bbe317da |
| nt/nt-2025-002-v1.40.pdf | NT 2025.002 v1.40 (20/05/2026) | Portal NF-e NT listing | 2026-07-20 | 4af56d5fae5eceaad63bb67f663dad4fd599f5bd9482d5474b419a97710193f0 |
| nt/nt-2025-002-v1.50.pdf | NT 2025.002 v1.50 (03/06/2026; foi CURRENT ate 04/08/2026, quando saiu a v1.51) | Portal NF-e NT listing | 2026-07-20 | cfc11a45b6ce9b491c2abf11d01865084b7a9dbcb2904e5414ae16e8e31099e3 |
| nt/nt-2026-004-v1.01.pdf | NT 2026.004 v1.01 (08/06/2026, alphanumeric CNPJ) | Portal NF-e NT listing | 2026-07-20 | 5f24a25351e790692754b07bbefac42ac67e70167a62a7806395d880f56675be |
| nt/it-2025-002-v1.50.pdf | IT 2025.002 v1.50 (15/04/2026) | Portal NF-e Informes Tecnicos listing | 2026-07-20 | d7efc771c2308ba7299e0ed991dfea843afb09d6cc6164213fd6b736c3cb61bd |
| nt/it-2025-002-v1.60.pdf | IT 2025.002 v1.60 (23/06/2026, CURRENT) | Portal NF-e Informes Tecnicos listing | 2026-07-20 | 0ee66e7093d7d29909de0e3fb67f2a4ae915e405b528245748715df32a972e17 |
| nt/esquemas-pl-010b-nt2025002-v1.30.zip | Pacote de Liberacao 010b (NT 2025.002 v1.30 era) | Portal NF-e Esquemas XML listing | 2026-07-20 | 2deaa8d430d0acb47deae06b9b6d1202dbb436baf3d2d3aa834a534a3d6fa1b8 |
| nt/esquemas-pl-010d-v1.03-cnpj-alfanumerico.zip | PL 010d v1.03 (CNPJ alfanumerico, NT 2026.004 v1.01, 10/07/2026) | Portal NF-e Esquemas XML listing | 2026-07-20 | 45ceefe4dfbbfec93958283b650a2f1e1734784f4770d070b9907754de081d9b |
| nt/esquemas-pl-010e-v1.02.zip | PL 010e v1.02 (NT 2025.002 v1.40 plus NT 2026.002/003, 10/07/2026; foi LATEST ate 31/08/2026, quando saiu o 010f) | Portal NF-e Esquemas XML listing | 2026-07-20 | d44ae5aa6a0d1cabf6235d2d2d47b75be5dd87bc6b90a7ec3dcec99c3d41bda1 |
| nt/esquemas-eventos-nt2025002-v1.30-rtc.zip | Schema dos eventos RTC (NT 2025.002 v1.30, upd. 2025) | Portal NF-e Esquemas XML listing | 2026-07-20 | e033e97cba218020ef492fc5af18a07eb4fd57d484ac3550ff331f01ae441783 |
| nt/esquemas-eventos-nt2025002-v1.40-rtc.zip | Schema dos eventos RTC (NT 2025.002 v1.40, publicado 27/07/2026, CURRENT em 2026-09-04) | Portal NF-e Esquemas XML listing | 2026-08-03 | a4c57ce95b225cd8852f90bd6c39ca28ae551636ff3f67eb2602b9fa847129b2 |
| nt/nt-2026-001-v1.02b.pdf | NT 2026.001 v1.02b (31/07/2026, PAA: Provedor de Assinatura e Autorizacao) | Portal NF-e NT listing | 2026-08-03 | 703310f95bff855aad9a4a7004515ce29ffff343334c53f0c45e9b32390296cd |
| nt/nt-2025-002-v1.51.pdf | NT 2025.002 v1.51 (04/08/2026, CURRENT). Alteracao de regras de validacao; aprovada pelo Ato Tecnico Conjunto RFB/CGIBS n. 1 de 31/07/2026 | Portal NF-e NT listing | 2026-09-04 | a4aaaa181522b43cd90b502f8ccb9e4bdabea30fed838e2d0790be5ba77254a4 |
| nt/nt-2026-006-v1.00.pdf | NT 2026.006 v1.00 (25/08/2026). Vinculacao entre NF-e/NFC-e e a transacao de split payment: grupo YC e evento 110300. Homologacao 05/10/2026, producao 03/11/2026 | Portal NF-e NT listing | 2026-09-04 | 47a65abde315fed1e6a8c6085a67ca483935cb57877ae5715d365377a725e05d |
| nt/it-2026-001-v1.01.pdf | IT 2026.001 v1.01 (25/08/2026). Tabela de Meios de Pagamento para a vinculacao de pagamento dos DF-e; aprovado pelo Ato Tecnico Conjunto n. 2 de 21/08/2026 | Portal NF-e Informes Tecnicos listing | 2026-09-04 | 1e58913755c4e617f30619448909dd9ef82b0c772bcd44dc85774e77bcd28900 |
| nt/esquemas-pl-010f-v1.04.zip | PL 010f v1.04 (31/08/2026, CURRENT; NT 2025.002 v1.50 e NT 2026.007 v1.00). Substitui o 010e v1.02, que o portal moveu para "em desuso" | Portal NF-e Esquemas XML listing | 2026-09-04 | b8589490a58a09a993a80e6ac4d7ed10f20892061ecfc56719337098d4b95998 |

## calculadora/

Probable origin for all artifacts below: https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/calculadora/calculadora-offline (per IT 2025.002 v1.50; confirm against the page at next download). Downloaded 2026-07-10 (inner file dates); the two top-level zips were copied into vendor/ on 2026-07-19. License: not stated anywhere in the distribution (verified 2026-07-20: source zip, JAR resources, container filesystem, examples README; only OpenJDK runtime legal texts present). Policy per locked D-2: this whole directory is gitignored, never committed or redistributed; local fetch via scripts/download-calculadora.sh. Amend if RFB/Serpro publish a license.

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| calculadora/calculadora-jar.zip | [to be confirmed] (contents match jar/ layout) | calculadora-offline page [to be confirmed] | 2026-07-10 | 52ffccf86e06800ee20f86d1c6ae9b12504893d1149db9b212a93a5a3a48e0a2 |
| calculadora/calculadora.zip | [to be confirmed] (contents match Docker/WSL package) | calculadora-offline page [to be confirmed] | 2026-07-10 | 59be4808c0b709f3f28189faa45208b0baca46d49935282fe01e891c090e2271 |
| calculadora/calculadora.tar.gz | container image filesystem | calculadora-offline page [to be confirmed] | 2026-07-10 | ca8dad6a9b9e389d98e0f7dccb93b6cf17eb762f7c78afa7556cbb18dbd1879f |
| calculadora/codigo-fonte-backend.zip | backend source, pom version 1.2.4 | calculadora-offline page [to be confirmed] | 2026-07-10 | dd17e3ba0855abf32a5bb4abc026dc8d5da06f8b6a71a5ca6d40e7283a5bba9d |
| calculadora/scripts-python-exemplo.zip | n/a | calculadora-offline page [to be confirmed] | 2026-07-10 | 65a1391476fc15eb0e26805e54ebb914eb4edd625061b422380686bacc3f36d5 |
| calculadora/jar/api-regime-geral.jar | 1.2.4 (Spring Boot 3.5.7, Java 21) | extracted from calculadora-jar.zip | 2026-07-10 | abad7c181c8fa189ecbf94cc390c01d7f32223a4987932d50db962906ae3244d |
| calculadora/jar/calculadora/db/calculadora-pro.db | SQLite 3 normative db | extracted from calculadora-jar.zip | 2026-07-10 | 345e303fd47f44facee4f5f6d00575b555ff310e6954c2f0ca80f90e1e5f09f1 |
| calculadora/linux/1-instalar.sh | n/a | extracted from calculadora.zip | 2026-07-10 | 0509ce99677979d7bf98c98d22385bd61652f9e054341b3e496c691bce2bfb5e |
| calculadora/linux/2-executar.sh | n/a | extracted from calculadora.zip | 2026-07-10 | 70375b72716fff1de900ed087d501e168ec5b0fc59f1ca1d1de9fffe680bc3dc |
| calculadora/linux/3-desinstalar.sh | n/a | extracted from calculadora.zip | 2026-07-10 | 4e85c6bd4c905c7537dbcb53fc2d51d29bdd6673beb2f77f0f84f81c03bd74b5 |
| calculadora/windows/1-instalar.bat | n/a | extracted from calculadora.zip | 2026-07-10 | fa7577149c7c0f05e23fd5b76ae6ade28d2aeca016a4827a01595460dedcfb56 |
| calculadora/windows/2-executar.bat | n/a | extracted from calculadora.zip | 2026-07-10 | b5da0b5d6bd7468cc32bc1beb9f914ee86844a37038e8a54b9666943cbd9393f |
| calculadora/windows/3-desinstalar.bat | n/a | extracted from calculadora.zip | 2026-07-10 | ebafdaabc339a4ad1c3b024cbd5f96d76430fd09cbe868edbcd1c05d2c549adc |

## Removed in Slice 1 (2026-07-20)

Two exact duplicates removed after byte-identity re-verification (moved to session scratchpad trash, not destroyed):
- "Manual de Integração Plataforma Publica de Split Payment v1.pdf" (sha256 c45ae410...dda157, identical to manual/manual-de-integracao-plataforma-publica-de-split-payment-v1.pdf)
- "Manual de Operações do Split Payment - Versão Preliminar.pdf" (sha256 c6ef3adb...59b18, identical to manual/30145925-minuta-split-payment-manual-de-operacoes.pdf)
Also removed: .DS_Store (Finder metadata, not an artifact).

Follow-up (Slice 4 or cleanup): calculadora-jar.zip and calculadora.zip likely duplicate the extracted jar/ and tar.gz content in archive form; decide keep-archives-only vs keep-extracted-only once the license and gitignore policy land.
