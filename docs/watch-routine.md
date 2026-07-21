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
   - Watch for: NT 2025.002 past v1.50 (03/06/2026); IT 2025.002 past v1.50 (a classification-table update published 23/06/2026 was pending incorporation); NT 2026.001 (PAA), NT 2026.004 (alphanumeric CNPJ); new Pacote de Liberacao.

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

Decided (D-3, 2026-07-20): the maintainer runs this checklist as a scheduled cloud routine, every Monday 09:00 America/Sao_Paulo, reporting only diffs vs the vendored baseline (`vendor/MANIFEST.md`). Anyone can reproduce it manually with this file, or wire their own scheduler: the checklist above is the whole contract. Baseline at 2026-07-20: NT 2025.002 v1.50, IT v1.60, PL 010e_v1.02, componente 1.2.4, 4 manuais da familia Split Payment ainda nao publicados.

## Saída para o site (novidades)

Decidido (D-8, 2026-07-20): quando a rotina de segunda-feira encontra diff vs a baseline vendorizada, ela abre um PR acrescentando uma entrada em `docs/site/novidades.md`, no contrato fixo daquela página: `## AAAA-MM-DD: <o que saiu>` seguido de 2 a 4 linhas (o que mudou, impacto em uma frase, link da fonte oficial), mais recente primeiro. O mantenedor revisa o PR e faz o merge; nada é publicado sem revisão humana. Semana sem mudança não gera PR nem entrada.
