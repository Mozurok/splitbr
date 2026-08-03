# Weekly regulatory watch routine

Cadence: weekly, Monday morning (America/Sao_Paulo). Owner: Bruno.
Purpose: catch new or revised official Split Payment / RTC artifacts before they invalidate vendored specs or shipped behavior (see `vendor/MANIFEST.md` for what is pinned). Findings go through Fhorja `capture-references` into `projects/bmazurok__splitbr/REFERENCES.md`, then into a task if action is needed.

## Sources to check (in order)

1. CGIBS publications (Manual de Operacoes revisions, resolucoes, the 4 unpublished manuals)
   - URL: https://www.cgibs.gov.br/ (documents land under `https://www.cgibs.gov.br/upload/arquivos/<YYYYMM>/...`)
   - Watch for: Manual de Tempos, Manual de Redes, Manual de Seguranca, Manual de Onboarding (none public as of 2026-07-20); Manual de Operacoes leaving minuta status; new resolucoes.

2. Portal NF-e Notas Tecnicas listing (NT/IT revisions)
   - URL: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY=
   - Schemas sibling page: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=BMPFMBoln3w=
   - Watch for: NT 2025.002 past v1.50 (03/06/2026, still current as of 2026-08-03); IT 2025.002 past v1.60 (23/06/2026, vendored); NT 2026.001 (PAA, v1.02b published 31/07/2026, NOT yet vendored); new Pacote de Liberacao past 010e v1.02 / 010d v1.03 (both 10/07/2026, vendored); new RTC events schema past the v1.30-era package (a v1.40 events package was published 27/07/2026 and is NOT yet vendored).
   - Access note: these listing pages do an ASP.NET cookie redirect and return HTTP 302 to a plain fetch. Use a browser user-agent plus a cookie jar before concluding a source is down: `curl -sL -c cj.txt -b cj.txt -A "Mozilla/5.0 ..." "<url>"`. The same warning, with the exact command, is in `watch-routine-prompt.md`; treating an empty result as "nothing published" is a recorded past failure of this routine.

3. Receita Federal news (atos conjuntos, manual releases, Calculadora announcements)
   - URL: https://www.gov.br/receitafederal/pt-br/assuntos/noticias
   - Watch for: new Ato Conjunto RFB/CGIBS (Manual de Integracao revisions, Etapa 2 arranjos); Calculadora releases and the roadmap GitHub publication (due by Dec/2026); piloto RTC changes.

4. Calculadora content-version endpoint (normative DB updates delivered to local installs)
   - URL: https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao
   - Quick check: `curl -s https://consumo.tributos.gov.br/servico/calcular-tributos-consumo/api/calculadora/dados-abertos/versao`
   - Watch for: version bump vs the vendored component (api-regime-geral 1.2.4, DB retrieved 2026-07-10); a bump means re-capture specs and re-check the CST x cClassTrib tables.

## On finding something new

1. Capture it: run `capture-references` with the URL (project bmazurok__splitbr) so REFERENCES.md stays the audit trail.
2. If it invalidates a vendored artifact: open or extend a task to re-vendor with a new MANIFEST.md row (never overwrite rows silently).
3. If it is one of the 4 unpublished manuals: that is a headline event; open a dedicated task (auth details, SLAs, and onboarding checklists land there).

## Trigger mechanism

Decided (D-3, 2026-07-20; repointed at launch, 2026-07-21): the maintainer runs this checklist as a scheduled cloud routine, every Monday 09:00 America/Sao_Paulo, reporting only diffs vs the vendored baseline. The live baseline is the PUBLIC repo itself: the routine clones https://github.com/Mozurok/splitbr (shallow) and reads `vendor/MANIFEST.md` as the source of truth for vendored versions, so the baseline never drifts from what is actually pinned. Anyone can reproduce it manually with this file, or wire their own scheduler: the checklist above is the whole contract. Standing fact outside the MANIFEST: 4 manuais da familia Split Payment ainda nao publicados (Tempos, Redes, Seguranca, Onboarding).

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
