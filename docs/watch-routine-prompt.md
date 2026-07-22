# Prompt pronto: checagem manual da vigilância regulatória

Complementa `docs/watch-routine.md` (a checklist e a rotina agendada, toda
segunda) e `.github/workflows/drift.yml` (só compara hash de 3 specs
OpenAPI). Este arquivo existe pra rodar a mesma checagem por conta própria,
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
   - CGIBS: https://www.cgibs.gov.br/ — Manual de Operações saindo de minuta,
     novas resoluções, ou qualquer um dos manuais ainda não publicados
     (Tempos, Redes, Segurança, Onboarding).
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

- **2026-07-22**: nada mudou. NT 2025.002 segue v1.50 (03/06/2026), IT
  2025.002 segue v1.60 (23/06/2026), esquemas 010e/010d seguem v1.02/v1.03
  (10/07/2026), Calculadora em V0039 (08/07/2026, anterior à captura
  vendorada). Achado fora de escopo: Ato Conjunto RFB/CGIBS 3/2026 sobre
  DeRE, não é de Split Payment.
