# Prompt pronto: checagem manual da vigilância regulatória

Complementa `docs/watch-routine.md` (a checklist e a rotina agendada, toda
segunda) e `.github/workflows/drift.yml` (compara os 3 specs OpenAPI da
Calculadora por conteúdo normalizado, mais o inventário de artefatos da página
do Split Payment no CGIBS, que desde 04/09/2026 cobre o contrato que gera os
pacotes). Este arquivo existe pra rodar a mesma checagem por conta própria,
quando quiser, como camada extra de garantia. Não substitui a rotina
agendada, só reduz a chance de uma mudança passar despercebida entre um
Monday e outro.

## Como usar

Cole o bloco abaixo como prompt num assistente com acesso a busca/fetch web
(Claude Code, por exemplo), de preferência com o repo `splitbr` clonado ou
aberto.

## O prompt

```
Você vai auditar se as fontes oficiais do Split Payment brasileiro (IBS/CBS,
LC 214/2025) mudaram desde a última captura vendorada neste repositório.

1. Leia vendor/MANIFEST.md inteiro: é a baseline. Anote versão/data de cada
   artefato em nt/, manual/, swagger/ e o db da calculadora.

2. Verifique estas fontes, nesta ordem, e compare com a baseline:
   - **CGIBS, página do Split Payment: https://www.cgibs.gov.br/split-payment**
     — é AQUI que o OpenAPI da Plataforma e o Manual de Integração são
     publicados, sem login. Confira a seção "Versão atual" contra o que está
     vendorado. Esta é a fonte de maior consequência da lista: o contrato dela
     é o que gera @splitbr/client e @splitbr/mock. Em 2026-08-24 ela publicou
     o OAS v1.1.0 e ninguém viu por 11 dias.
   - CGIBS, raiz: https://www.cgibs.gov.br/ — novas resoluções (a série já vai
     à 17 e só a 6/2026 está vendorada), Manual de Operações ou de Tempos
     saindo de minuta, ou qualquer um dos 3 manuais ainda não publicados
     (Redes, Segurança, Onboarding).
   - Notas Técnicas do Portal NF-e:
     https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
     — versão de NT 2025.002 mais nova que a da baseline.
   - Informes Técnicos:
     https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=hXzemuyNHW4=
     — mesma lógica para IT 2025.002.
   - Esquemas XML:
     https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=
     — pacote de liberação da família "010" (010d/010e) mais novo que o da
     baseline.
   - Endpoint de versão da Calculadora:
     https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao
   - Notícias da Receita Federal:
     https://www.gov.br/receitafederal/pt-br/assuntos/noticias — Split
     Payment, Atos Conjuntos RFB/CGIBS, Calculadora.

   Aviso técnico: o portal nfe.fazenda.gov.br faz um redirect ASP.NET que
   depende de cookie, e isso quebra ferramentas de fetch simples (erro de
   certificado ou página em branco). Se a busca falhar nesses dois links,
   use curl com cookie jar antes de concluir que a fonte está fora do ar:
   curl -sL -c cj.txt -b cj.txt "<url>"

3. Para cada fonte, diga MATCH (nada mudou) ou NOVO (achou algo mais recente
   que a baseline, com data e link).

4. Se achar algo NOVO: siga "On finding something new" em
   docs/watch-routine.md (capture-references, abrir task se invalidar
   artefato vendorado, tratamento especial se for um dos 4 manuais
   inéditos).

5. Feche com um resumo de 3 a 5 linhas: o que foi checado, o que mudou (ou
   "nada mudou"), e o próximo passo se houver.
```

## Histórico de execuções manuais

- **2026-09-04**: SEIS ACHADOS, um deles grave. O **OpenAPI da Plataforma saiu
  do v0.0.10 para o v1.1.0** (publicado em 24/08/2026, pareado com o Manual de
  Integração v1.1.0): 12 rotas de stream renomeadas, 3 rotas novas do MOC,
  `X-JWS-Signature` obrigatório nas 43 operações e 33 de 55 schemas comuns
  alterados. Ficou 11 dias sem detecção porque o detector não olhava a página
  do CGIBS, com base numa premissa falsa ("não existe fonte pública") que
  estava escrita no código e no README. Também novos: NT 2025.002 v1.51
  (04/08), NT 2026.006 e IT 2026.001 (25/08), PL 010f (31/08) e a Calculadora
  de produção em app 1.3.1 / banco V0043 (31/08, contra 1.2.4 / V0039
  vendorado). O Manual de Tempos, que quatro documentos davam como inédito,
  está publicado como minuta desde 15/07/2026. Contratos da Calculadora:
  portal divergente (issue #6, aberta desde 31/08 sem tratamento) e piloto
  divergente; os dois re-vendorados nesta data, os quatro alvos voltaram a
  MATCH. Correção de processo: quarto alvo no `drift-check.mjs` sobre o
  inventário da página do CGIBS. Aviso de coleta novo: o `api-docs` do piloto
  passou a responder desafio anti-bot ao `curl`; o `fetch` do Node passa.
- **2026-08-03**: DOIS ACHADOS. NT 2026.001 v1.02b (PAA), publicada em
  31/07/2026, e o pacote de esquemas de eventos da NT 2025.002 v1.40 (RTC),
  publicado em 27/07/2026: nenhum dos dois estava vendorado. Seguem iguais à
  baseline: NT 2025.002 v1.50 (03/06/2026), IT 2025.002 v1.60 (23/06/2026),
  esquemas 010e v1.02 e 010d v1.03 (10/07/2026), Calculadora em V0039
  (08/07/2026, igual à linha do banco vendorado). CGIBS sem manual novo; os 4
  manuais inéditos seguem inéditos. Contratos: portal e api-split MATCH, piloto
  divergente (issue #1) e re-vendorado no mesmo dia. Próximo passo: vendorar os
  dois artefatos novos (D-5 da task drift-detector-hardening).
- **2026-07-22**: nada mudou. NT 2025.002 segue v1.50 (03/06/2026), IT
  2025.002 segue v1.60 (23/06/2026), esquemas 010e/010d seguem v1.02/v1.03
  (10/07/2026), Calculadora em V0039 (08/07/2026, anterior à captura
  vendorada). Achado fora de escopo: Ato Conjunto RFB/CGIBS 3/2026 sobre
  DeRE, não é de Split Payment.
