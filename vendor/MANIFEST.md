# vendor/ MANIFEST

Pinned inventory of vendored official artifacts. Every file in vendor/ (except this manifest) must have a row. Verify with: recompute SHA-256 per file and diff against the rows. Maintained by the Fhorja task flow (bmazurok__splitbr); update on every vendor change.

Conventions: `Retrieved` is the date the artifact was obtained from its source. `[to be confirmed]` marks a source URL to pin down during P0 (Slice 2 or Slice 4). Calculadora artifacts: license `[unknown yet]`, pending Slice 4; do not redistribute or commit them publicly until that resolves.

## swagger/

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| swagger/openapi-v0_0_10.json | OAS 3.1, API v0.0.10 | consumo.tributos.gov.br > menu > Manuais [exact URL to be confirmed] | 2026-07-19 | c5f60c849b22149d90ac2e3df6fcbe3ff9b0fb1f0c8b6463622fabb415629e2b |
| swagger/calculadora-openapi.portal.json | OAS 3.1.0, info.version v0, 36 paths | https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/api-docs | 2026-07-20 | fc821c94dcfc3efebdddbbe033a0cdaeb0041a210e12111c169af7f452918c36 |
| swagger/calculadora-openapi.piloto.json | OAS 3.1.0, info.version v0, 36 paths | https://piloto-cbs.tributos.gov.br/servico/calculadora-consumo/api/api-docs | 2026-07-20 | 7483d0029c985c46da901509977a1f4644e172d27168d4c53421202b468464be |
| swagger/calculadora-openapi.local.json | OAS 3.1.0, info.version v0, 37 paths (component api-regime-geral 1.2.4 via Docker) | http://localhost:18080/api/api-docs (container from calculadora/calculadora.tar.gz) | 2026-07-20 | 957593b74a81109fa66acfe570ab875225e620facf60f13258042220a075cf35 |
| swagger/api-split-openapi.portal.json | OAS 3.1.0, info.version v0, 2 paths (Split Payment Simplificado) | https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api-split/api-docs | 2026-07-20 | 82c95912c1aed19ae77059a0b99afa42eb2f868bb198e9b9a74bf23581c9be42 |
| swagger/api-split-openapi.local.json | OAS 3.1.0, info.version v0, 2 paths (api-split-payment-simplificado.jar via Docker, :8081/api) | http://localhost:18081/api/api-docs (container from calculadora/calculadora.tar.gz) | 2026-07-20 | 43ca11b929d01abecf4b249c4351cf56383ce5deaeda025135071bf5f43954d9 |

Contract diff note (2026-07-20): portal and piloto share the same 36-path set but differ in content: piloto's cTribNac accepts 4 or 6 digits (`^\d{4}$|^\d{6}$`) while portal accepts only 4 (`^\d{4}$`), plus example-formatting differences; per the brief, prefer portal as the stable codegen reference and read piloto as change-anticipation. Local (1.2.4) adds `/versao/status` and has further minor diffs vs portal. api-split note: the hosted spec's `servers[0].url` stamps the responding backend instance's port (observed :11088 then :11011 an hour apart), so its byte hash is capture-specific; the local api-split spec is content-identical to the portal one after removing the servers block.

## manual/

| File | Version | Source | Retrieved | SHA-256 |
|---|---|---|---|---|
| manual/manual-de-integracao-plataforma-publica-de-split-payment-v1.pdf | v1.0 | consumo.tributos.gov.br > menu > Manuais [exact URL to be confirmed] | 2026-07-19 | c45ae4101fd140c76efb571810cc1eee67dcd525f7f15942401adfa065dda157 |
| manual/manual-de-integracao-plataforma-publica-de-split-payment-v1.txt | derived from the PDF above (pdftotext -layout) | local extraction | 2026-07-20 | fb38ba1c04de2716c35b64a0c7c6c0cd6f0b2a143b087b19f0b84904aa94dbb7 |
| manual/30145925-minuta-split-payment-manual-de-operacoes.pdf | minuta Jun/2026 | cgibs.gov.br uploads [exact URL to be confirmed] | 2026-07-19 | c6ef3adb63981864a637fbcc1198d2956a6ba44866c8cb4000da7f07ccd59b18 |
| manual/30145925-minuta-split-payment-manual-de-operacoes.txt | derived from the PDF above (pdftotext -layout) | local extraction | 2026-07-20 | 1463d1def6f45a732e9602e0371c8f97c8cdff0bc3b49649c26d82af0ccf925d |
| manual/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf | Resolucao CGIBS 6/2026 (30/04/2026) | https://www.cgibs.gov.br/upload/arquivos/202604/30084927-res-cgibs-n-6-30-abr-2026-regulamenta-o-ibs.pdf | 2026-07-19 | 9ed7032ef9c25bbee51bdb5e90f60e1ad01a2bf56cb41a28221c3db7f61d419a |

## nt/

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
| nt/nt-2025-002-v1.50.pdf | NT 2025.002 v1.50 (03/06/2026, CURRENT) | Portal NF-e NT listing | 2026-07-20 | cfc11a45b6ce9b491c2abf11d01865084b7a9dbcb2904e5414ae16e8e31099e3 |
| nt/nt-2026-004-v1.01.pdf | NT 2026.004 v1.01 (08/06/2026, alphanumeric CNPJ) | Portal NF-e NT listing | 2026-07-20 | 5f24a25351e790692754b07bbefac42ac67e70167a62a7806395d880f56675be |
| nt/it-2025-002-v1.50.pdf | IT 2025.002 v1.50 (15/04/2026) | Portal NF-e Informes Tecnicos listing | 2026-07-20 | d7efc771c2308ba7299e0ed991dfea843afb09d6cc6164213fd6b736c3cb61bd |
| nt/it-2025-002-v1.60.pdf | IT 2025.002 v1.60 (23/06/2026, CURRENT) | Portal NF-e Informes Tecnicos listing | 2026-07-20 | 0ee66e7093d7d29909de0e3fb67f2a4ae915e405b528245748715df32a972e17 |
| nt/esquemas-pl-010b-nt2025002-v1.30.zip | Pacote de Liberacao 010b (NT 2025.002 v1.30 era) | Portal NF-e Esquemas XML listing | 2026-07-20 | 2deaa8d430d0acb47deae06b9b6d1202dbb436baf3d2d3aa834a534a3d6fa1b8 |
| nt/esquemas-pl-010d-v1.03-cnpj-alfanumerico.zip | PL 010d v1.03 (CNPJ alfanumerico, NT 2026.004 v1.01, 10/07/2026) | Portal NF-e Esquemas XML listing | 2026-07-20 | 45ceefe4dfbbfec93958283b650a2f1e1734784f4770d070b9907754de081d9b |
| nt/esquemas-pl-010e-v1.02.zip | PL 010e v1.02 (NT 2025.002 v1.40 plus NT 2026.002/003, 10/07/2026, LATEST) | Portal NF-e Esquemas XML listing | 2026-07-20 | d44ae5aa6a0d1cabf6235d2d2d47b75be5dd87bc6b90a7ec3dcec99c3d41bda1 |
| nt/esquemas-eventos-nt2025002-v1.30-rtc.zip | Schema dos eventos RTC (NT 2025.002 v1.30, upd. 2025) | Portal NF-e Esquemas XML listing | 2026-07-20 | e033e97cba218020ef492fc5af18a07eb4fd57d484ac3550ff331f01ae441783 |

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
