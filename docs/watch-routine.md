# Weekly regulatory watch routine

Cadence: weekly, Monday morning (America/Sao_Paulo). Owner: Bruno.
Purpose: catch new or revised official Split Payment / RTC artifacts before they invalidate vendored specs or shipped behavior (see `vendor/MANIFEST.md` for what is pinned). Findings go through Fhorja `capture-references` into `projects/bmazurok__splitbr/REFERENCES.md`, then into a task if action is needed.

## Sources to check (in order)

1. CGIBS publications (Manual de Operacoes revisions, resolucoes, the 4 unpublished manuals)
   - URL: https://www.cgibs.gov.br/ (documents land under `https://www.cgibs.gov.br/upload/arquivos/<YYYYMM>/...`)
   - **Split Payment page: https://www.cgibs.gov.br/split-payment** — this is where the Platform's OpenAPI and the Manual de Integracao are published, both without login. It is now the fourth `drift-check.mjs` target (pinned inventory in `vendor/cgibs-split-payment-artefatos.json`), but check it by eye too: the detector compares the artifact list, not the contents of a re-uploaded file.
   - Watch for: Manual de Redes, Manual de Seguranca, Manual de Onboarding (none public as of 2026-09-04); Manual de Operacoes (minuta jun/2026) and Manual de Tempos (minuta 15/07/2026) leaving minuta status; new resolucoes (the series already runs to at least 17, and only 6/2026 is vendored); new **Ato Tecnico Conjunto RFB/CGIBS**, the instrument that now formally approves RTC notes.

2. Portal NF-e Notas Tecnicas listing (NT/IT revisions)
   - URL: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
   - Schemas sibling page: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=
   - Watch for (state as of 2026-09-04, all vendored unless said otherwise): NT 2025.002 past **v1.51** (04/08/2026); IT 2025.002 past v1.60 (23/06/2026); NT 2026.001 v1.02b (31/07/2026); NT 2026.006 v1.00 (25/08/2026, NF-e to split-payment transaction binding); IT 2026.001 v1.01 (25/08/2026); new Pacote de Liberacao past **010f v1.04** (31/08/2026) and past 010d v1.03 (10/07/2026); RTC events schema v1.40 (27/07/2026).
   - Access note: these listing pages do an ASP.NET cookie redirect and return HTTP 302 to a plain fetch. Use a browser user-agent plus a cookie jar before concluding a source is down: `curl -sL -c cj.txt -b cj.txt -A "Mozilla/5.0 ..." "<url>"`. The same warning, with the exact command, is in `watch-routine-prompt.md`; treating an empty result as "nothing published" is a recorded past failure of this routine.

3. Receita Federal news (atos conjuntos, manual releases, Calculadora announcements)
   - URL: https://www.gov.br/receitafederal/pt-br/assuntos/noticias
   - Watch for: new Ato Conjunto RFB/CGIBS (Manual de Integracao revisions, Etapa 2 arranjos); Calculadora releases and the roadmap GitHub publication (due by Dec/2026); piloto RTC changes.

4. Calculadora content-version endpoint (normative DB updates delivered to local installs)
   - URL: https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao
   - Quick check: `curl -s https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao`
   - Watch for: version bump vs production, which was app **1.3.1-0e46e51f** and DB **V0043** on 2026-08-31. The vendored offline distribution is behind it (component 1.2.4, DB V0039, retrieved 2026-07-10) and re-downloading it is open work. A bump means re-capture specs and re-check the CST x cClassTrib tables.

## On finding something new

1. Capture it: run `capture-references` with the URL (project bmazurok__splitbr) so REFERENCES.md stays the audit trail.
2. If it invalidates a vendored artifact: open or extend a task to re-vendor with a new MANIFEST.md row (never overwrite rows silently).
3. If it is one of the 3 still-unpublished manuals (Redes, Seguranca, Onboarding): that is a headline event; open a dedicated task (auth details, SLAs, and onboarding checklists land there).

## Trigger mechanism

Decided (D-3, 2026-07-20; repointed at launch, 2026-07-21): the maintainer runs this checklist as a scheduled cloud routine, every Monday 09:00 America/Sao_Paulo, reporting only diffs vs the vendored baseline. The live baseline is the PUBLIC repo itself: the routine clones https://github.com/Mozurok/splitbr (shallow) and reads `vendor/MANIFEST.md` as the source of truth for vendored versions, so the baseline never drifts from what is actually pinned. Anyone can reproduce it manually with this file, or wire their own scheduler: the checklist above is the whole contract. Standing fact outside the MANIFEST: 3 manuais da familia Split Payment ainda nao publicados (Redes, Seguranca, Onboarding). O Manual de Tempos saiu como minuta em 15/07/2026 e esta vendorado.

## Estado da rotina (auditado em 2026-09-04)

A auditoria de 2026-09-04 respondeu, com evidência, a pergunta que estava em aberto desde agosto: **a rotina não cobria o artefato mais importante do projeto, por causa de uma premissa falsa registrada no próprio código.**

- O `drift-check.mjs` afirmava, num comentário, que o OAS que gera os pacotes não tinha fonte pública e que por isso não dava para monitorá-lo (o gap D-4). O `README.md` repetia a mesma coisa. Era falso: https://www.cgibs.gov.br/split-payment serve o zip do OAS sem login e sem mTLS, e o arquivo de lá é byte-idêntico ao vendorado desde julho.
- O custo foi medido: o **OpenAPI v1.1.0** saiu em 24/08/2026 e passou **11 dias** sem detecção, junto com o Manual de Integração v1.1.0. Nenhuma das duas publicações apareceu em issue, PR ou entrada de novidades.
- Outros quatro artefatos publicados entre 04/08 e 31/08 também passaram batido: NT 2025.002 v1.51, NT 2026.006, IT 2026.001 e o PL 010f.
- O que já funcionava, e melhor do que parecia: o detector pegou o drift do contrato de produção da Calculadora e abriu a issue #6 em **17/08/2026**, avisando de novo em 24/08 e 31/08. Ela ficou **18 dias** sem tratamento. A detecção automática fez o trabalho dela três vezes; o que faltou foi resposta humana. (Registro anterior dizia 31/08 e 4 dias: foi erro de leitura, a data que aparece por padrão no `gh issue list` é a de atualização, não a de criação.)
- **O detector também grita lobo, e isso corrói a resposta.** Duas issues já foram abertas em falso por indisponibilidade de rede do runner, não por drift: a #4 (03/08) e a #9 (04/09). Nos dois runs consecutivos de 04/09 os alvos que falharam foram diferentes a cada vez, o que descarta bloqueio de host específico e aponta intermitência da rota dos runners do GitHub para hosts gov.br. Uma issue chamada "Drift detectado" que na verdade é soluço de rede ensina o mantenedor a não confiar no alarme, e um alarme em que ninguém confia explica 18 dias de silêncio melhor do que desatenção.
- Correção aplicada nesta data: quarto alvo no `drift-check.mjs`, apontado para o inventário de artefatos daquela página, com o inventário pinado em `vendor/cgibs-split-payment-artefatos.json` e testes cobrindo o comportamento. Artefato novo publicado ali reprova o run.
- **Limite desse alvo, medido no mesmo dia**: `www.cgibs.gov.br` não aceita conexão do runner do GitHub Actions (connect timeout em 443, três tentativas, enquanto `consumo.tributos.gov.br` e `piloto-cbs.tributos.gov.br` respondem do mesmo runner). É bloqueio do host, não rede instável. O alvo então declara `severidadeIndisponivel: "ignore"`: no CI ele reporta e não reprova, e só compara de verdade quando roda de uma rede que alcança o host, como a máquina do mantenedor via `pnpm drift-check`. Drift ali continua reprovando quando alcançável. **Consequência prática: para esse contrato, a checagem semanal manual não é redundância, é a cobertura principal.** Se um dia o bloqueio cair, o CI passa a cobrir sozinho e essa nota sai.

A lição vale além deste caso: **uma limitação declarada em comentário nunca tinha sido verificada**. Ela virou verdade porque foi escrita com confiança, e sobreviveu a várias revisões porque ninguém testa um comentário. Quando um artefato afirma que algo é impossível, o barato é gastar cinco minutos tentando fazer.

## Estado da rotina (auditado em 2026-08-03)

Auditoria feita ao investigar por que dois artefatos publicados em 27/07 e 31/07 não apareceram em lugar nenhum. O que dá pra afirmar pelo repositório:

- A camada manual rodou uma vez e está registrada: 2026-07-22, sem mudanças, e correta para aquela data (os dois artefatos novos são posteriores).
- Nenhuma saída da rotina agendada chegou ao repositório: zero PRs abertos desde sempre (`gh pr list --state all`), uma única branch remota, nenhuma entrada nova em `docs/site/novidades.md` (`git log`), e a única issue aberta foi criada pelo próprio workflow de drift.
- **Não dá pra determinar pelo repositório se a rotina agendada está configurada e rodando.** Por D-3 ela vive fora do repo (rotina de nuvem que clona e lê `vendor/MANIFEST.md`), então uma execução sem achados não deixa rastro nenhum aqui, por desenho. Distinguir "rodou e não achou nada" de "nunca rodou" exige olhar a configuração da rotina, o que só o mantenedor consegue.
- Ponto aberto pro mantenedor: confirmar se a rotina de segunda está ativa. Se estiver, a execução de 27/07 deveria ter encontrado o pacote de eventos RTC v1.40 publicado naquele mesmo dia, e não encontrou.

Melhoria barata enquanto isso: fazer a rotina registrar toda execução (inclusive as sem achados) em `watch-routine-prompt.md`, na seção de histórico, como a execução manual de 2026-07-22 já faz. Uma rotina silenciosa quando não acha nada é indistinguível de uma rotina desligada.

## Checagem manual extra

Além da rotina agendada, `docs/watch-routine-prompt.md` tem um prompt pronto
pra rodar essa mesma checklist por conta própria, quando quiser, como camada
extra de garantia.

## Saída para o site (novidades)

Decidido (D-8, 2026-07-20): quando a rotina de segunda-feira encontra diff vs a baseline vendorizada, ela abre um PR acrescentando uma entrada em `docs/site/novidades.md`, no contrato fixo daquela página: `## AAAA-MM-DD: <o que saiu>` seguido de 2 a 4 linhas (o que mudou, impacto em uma frase, link da fonte oficial), mais recente primeiro. O mantenedor revisa o PR e faz o merge; nada é publicado sem revisão humana. Semana sem mudança não gera PR nem entrada.
