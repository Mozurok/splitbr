<script setup lang="ts">
/**
 * Demo interativa do split payment -- rework D-11..D-13.
 * Guiado-primeiro (D-12): abre no modo guiado com um passo 1 obvio e um caminho
 * unico claro; o modo livre e secundario. Toggle legivel. Palco claro (D-13).
 * Todo numero vem da calcularSegregacao publicada (D-1). SSR-safe.
 */
import { computed, reactive, ref, watch } from "vue";
import { calcularSplit, formatarBRL } from "./demo/engine.js";
import { livreParaCaso, type EntradaLivre } from "./demo/estado.js";
import { casos } from "./demo/casos.js";
import { snippetCodigo } from "./demo/codigo.js";
import "./demo.css";

type Modo = "guiado" | "livre";
const modo = ref<Modo>("guiado");

// Livre
const entrada = reactive<EntradaLivre>({ valorNotaReais: 1000, cbsPct: 0.9, ibsPct: 0.1, fracaoPaga: 1 });
const casoLivre = computed(() => livreParaCaso(entrada));
const resultadoLivre = computed(() => calcularSplit(casoLivre.value));
const parcial = computed(() => entrada.fracaoPaga < 1);

// Guiado
const casoIdx = ref(0);
const passoIdx = ref(0);
const casoAtivo = computed(() => casos[casoIdx.value]);
const passo = computed(() => casoAtivo.value.passos[passoIdx.value]);
const ultimoPasso = computed(() => passoIdx.value === casoAtivo.value.passos.length - 1);
const progresso = computed(() => (passoIdx.value + 1) / casoAtivo.value.passos.length);
const resultadoGuiado = computed(() => calcularSplit(casoAtivo.value.entrada.segregacao));

// Unificado
const mostraResultado = computed(() => (modo.value === "livre" ? true : (passo.value?.mostraResultado ?? false)));
const resultado = computed(() => (modo.value === "livre" ? resultadoLivre.value : resultadoGuiado.value));
const valorPagoCentavos = computed(() =>
  modo.value === "livre" ? casoLivre.value.valorPagoCentavos : casoAtivo.value.entrada.segregacao.valorPagoCentavos,
);
const foiParaFisco = computed(() => (mostraResultado.value ? resultado.value.foiParaFiscoCentavos : 0));
const sobrou = computed(() => (mostraResultado.value ? resultado.value.sobrouParaEmpresaCentavos : 0));

function usarContagem(alvo: () => number) {
  const exibido = ref(alvo());
  let raf = 0;
  const reduzido = () =>
    typeof window === "undefined" || (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false);
  watch(alvo, (novo, antigo) => {
    if (reduzido()) { exibido.value = novo; return; }
    cancelAnimationFrame(raf);
    const inicio = antigo ?? novo;
    const t0 = performance.now();
    const passoAnim = (t: number) => {
      const p = Math.min(1, (t - t0) / 450);
      exibido.value = Math.round(inicio + (novo - inicio) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(passoAnim);
    };
    raf = requestAnimationFrame(passoAnim);
  });
  return exibido;
}
const fiscoExib = usarContagem(() => foiParaFisco.value);
const sobrouExib = usarContagem(() => sobrou.value);

const pctFisco = computed(() => {
  const pago = valorPagoCentavos.value;
  return pago > 0 && mostraResultado.value ? (resultado.value.foiParaFiscoCentavos / pago) * 100 : 0;
});
const pctEmpresa = computed(() => (mostraResultado.value ? 100 - pctFisco.value : 0));

const codigoSnippet = computed(() => {
  if (modo.value === "livre") {
    const c = casoLivre.value;
    return snippetCodigo("POST /api/v1/boleto", c.valorNotaCentavos, c.cbsInformadoCentavos, c.ibsInformadoCentavos);
  }
  const seg = casoAtivo.value.entrada.segregacao;
  return snippetCodigo(passo.value?.tecnico?.endpoint ?? "POST /api/v1/boleto", seg.valorNotaCentavos, seg.cbsInformadoCentavos, seg.ibsInformadoCentavos);
});
const copiado = ref(false);
function copiar() {
  if (typeof navigator !== "undefined" && navigator.clipboard) {
    navigator.clipboard.writeText(codigoSnippet.value).then(() => {
      copiado.value = true;
      setTimeout(() => (copiado.value = false), 1500);
    });
  }
}
function escolherCaso(i: number) { casoIdx.value = i; passoIdx.value = 0; }
function proximo() { if (!ultimoPasso.value) passoIdx.value += 1; }
function voltar() { if (passoIdx.value > 0) passoIdx.value -= 1; }
function trocarModo(m: Modo) { modo.value = m; passoIdx.value = 0; }
function pct(n: number) { return n.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + "%"; }
</script>

<template>
  <div class="splitbr-demo demo">
    <header class="cabeca">
      <p class="olho">Simulador ao vivo &middot; sem instalar nada</p>
      <h2 class="titulo">Veja seu dinheiro se dividir</h2>
      <p class="sub">Siga o passo a passo abaixo. Cada valor é calculado pelo código publicado no <code>@splitbr/client</code>.</p>
      <div class="modos" role="tablist" aria-label="Modo da demo">
        <button role="tab" :aria-selected="modo === 'guiado'" :class="{ ativo: modo === 'guiado' }" @click="trocarModo('guiado')">
          <span class="modo-i">1</span> Passo a passo
        </button>
        <button role="tab" :aria-selected="modo === 'livre'" :class="{ ativo: modo === 'livre' }" @click="trocarModo('livre')">
          Brincar com os valores
        </button>
      </div>
    </header>

    <div class="principal">
      <div class="coluna-demo">
        <!-- GUIADO -->
        <section v-if="modo === 'guiado'" class="palco" aria-label="Caso guiado">
          <div class="casos-tabs">
            <button v-for="(c, i) in casos" :key="c.id" :class="{ ativo: i === casoIdx }" type="button" @click="escolherCaso(i)">
              {{ c.titulo }}
            </button>
          </div>
          <div class="progresso">
            <span class="passo-num">Passo {{ passoIdx + 1 }} de {{ casoAtivo.passos.length }}</span>
            <div class="trilha"><div class="preenchido" :style="{ width: progresso * 100 + '%' }" /></div>
          </div>
          <h3 class="passo-titulo">{{ passo.titulo }}</h3>
          <p class="passo-texto">{{ passo.narrativa }}</p>
          <p v-if="passo.coachTip" class="coach">{{ passo.coachTip }}</p>
          <div class="nav">
            <button class="btn ghost" type="button" :disabled="passoIdx === 0" @click="voltar">Voltar</button>
            <button v-if="!ultimoPasso" class="btn primario" type="button" @click="proximo">Próximo passo &rarr;</button>
            <button v-else class="btn ghost" type="button" @click="escolherCaso(casoIdx)">Rever do início</button>
          </div>
        </section>

        <!-- LIVRE -->
        <section v-else class="palco" aria-label="Valores da simulação">
          <label class="campo">
            <span class="rotulo">Valor da nota</span>
            <div class="valor-in"><span class="prefixo">R$</span><input v-model.number="entrada.valorNotaReais" type="number" min="0" max="1000000000" step="50" inputmode="decimal" /></div>
            <input v-model.number="entrada.valorNotaReais" type="range" min="0" max="1000000" step="1000" aria-label="Valor da nota" />
          </label>
          <label class="campo"><span class="rotulo">CBS informada <span class="tag">{{ pct(entrada.cbsPct) }}</span></span><input v-model.number="entrada.cbsPct" type="range" min="0" max="5" step="0.1" /></label>
          <label class="campo"><span class="rotulo">IBS informado <span class="tag">{{ pct(entrada.ibsPct) }}</span></span><input v-model.number="entrada.ibsPct" type="range" min="0" max="5" step="0.1" /></label>
          <div class="campo">
            <span class="rotulo">Pagamento</span>
            <div class="segmentos">
              <button type="button" :class="{ ativo: !parcial }" @click="entrada.fracaoPaga = 1">Integral</button>
              <button type="button" :class="{ ativo: parcial }" @click="entrada.fracaoPaga = entrada.fracaoPaga < 1 ? entrada.fracaoPaga : 0.5">Parcial</button>
            </div>
            <input v-if="parcial" v-model.number="entrada.fracaoPaga" type="range" min="0.05" max="0.95" step="0.05" aria-label="Fração paga" />
          </div>
        </section>

        <!-- RESULTADO (focal) -->
        <section class="resultado" aria-live="polite">
          <div class="manchetes">
            <div class="manchete fisco" :class="{ vivo: mostraResultado }">
              <span class="m-rotulo">Foi para o fisco</span>
              <span class="m-num">{{ formatarBRL(fiscoExib) }}</span>
            </div>
            <div class="manchete empresa" :class="{ vivo: mostraResultado }">
              <span class="m-rotulo">Sobrou para a empresa</span>
              <span class="m-num">{{ formatarBRL(sobrouExib) }}</span>
            </div>
          </div>
          <div class="fluxo" aria-hidden="true">
            <div class="fluxo-empresa" :style="{ width: pctEmpresa + '%' }"></div>
            <div class="fluxo-fisco" :style="{ width: pctFisco + '%' }"></div>
          </div>
          <p v-if="!mostraResultado" class="placeholder">O imposto aparece aqui no momento do pagamento. Avance até lá.</p>
          <details v-else class="breakdown">
            <summary>Como esse valor se divide</summary>
            <div class="linha"><span>Valor pago</span><span class="v">{{ formatarBRL(valorPagoCentavos) }}</span></div>
            <div class="linha sub"><span>CBS</span><span class="v">{{ formatarBRL(resultado.cbsCentavos) }}</span></div>
            <div class="linha sub"><span>IBS</span><span class="v">{{ formatarBRL(resultado.ibsCentavos) }}</span></div>
            <div class="linha total"><span>Líquido para a empresa</span><span class="v">{{ formatarBRL(resultado.sobrouParaEmpresaCentavos) }}</span></div>
          </details>
        </section>
      </div>

      <!-- CODIGO -->
      <aside class="coluna-codigo">
        <div class="cod-cab"><span class="cod-titulo">Como um PSP integra</span><button type="button" class="cod-copiar" @click="copiar">{{ copiado ? "Copiado!" : "Copiar" }}</button></div>
        <pre class="cod-bloco"><code>{{ codigoSnippet }}</code></pre>
        <p class="cod-nota">Assim um PSP chama a plataforma real com o <code>@splitbr/client</code>. Esta demo calcula o mesmo split localmente, com a fórmula publicada, sem servidor.</p>
      </aside>
    </div>

    <p class="aviso">Alíquotas de teste de 2026 (fase de transição); as definitivas ainda não valem. Veja a <a href="/splitbr/base-legal">base legal</a> ou o <a href="/splitbr/tutorial">tutorial</a>.</p>
  </div>
</template>

<style scoped>
.demo { color: var(--demo-text-1); background: var(--demo-bg); border: 1px solid var(--demo-border); border-radius: var(--demo-radius); padding: clamp(20px, 4vw, 40px); box-shadow: var(--demo-shadow); margin: 28px 0; }
.cabeca { margin-bottom: 22px; }
.olho { margin: 0; font-size: 0.8rem; font-weight: 700; letter-spacing: 0.06em; text-transform: uppercase; color: var(--demo-accent-text); }
.titulo { font: var(--demo-font-display); margin: 6px 0 8px; border: 0; padding: 0; background: var(--demo-gradient); -webkit-background-clip: text; background-clip: text; color: transparent; }
.sub { margin: 0 0 18px; color: var(--demo-text-2); max-width: 54ch; }
.sub code, .cod-nota code { color: var(--demo-accent-text); }

/* Toggle legivel: pilula ativa inequivoca */
.modos { display: inline-flex; gap: 6px; background: var(--demo-surface); border: 1px solid var(--demo-border); border-radius: 999px; padding: 5px; }
.modos button { display: inline-flex; align-items: center; gap: 7px; border: 0; background: transparent; color: var(--demo-text-2); padding: 9px 18px; border-radius: 999px; font-weight: 600; font-size: 0.92rem; cursor: pointer; transition: background var(--demo-dur) var(--demo-ease), color var(--demo-dur) var(--demo-ease); }
.modos button.ativo { background: var(--demo-cta-bg); color: var(--demo-cta-fg); box-shadow: var(--demo-shadow-card); }
.modo-i { display: inline-grid; place-items: center; width: 20px; height: 20px; border-radius: 999px; background: color-mix(in srgb, var(--demo-cta-fg) 22%, transparent); font-size: 0.78rem; font-weight: 800; }
.modos button:not(.ativo) .modo-i { background: var(--demo-border); color: var(--demo-accent-text); }

.principal { display: grid; grid-template-columns: 1fr; gap: var(--demo-gap); align-items: start; }
.coluna-demo { display: flex; flex-direction: column; gap: var(--demo-gap); }

.palco { display: flex; flex-direction: column; gap: 14px; background: var(--demo-surface); border-radius: var(--demo-radius-sm); padding: 22px; }
.casos-tabs { display: flex; flex-wrap: wrap; gap: 8px; }
.casos-tabs button { border: 1px solid var(--demo-border); background: var(--demo-card); color: var(--demo-text-2); border-radius: 999px; padding: 6px 13px; font-size: 0.82rem; font-weight: 600; cursor: pointer; transition: all var(--demo-dur) var(--demo-ease); }
.casos-tabs button.ativo { border-color: var(--demo-cta-bg); color: var(--demo-cta-fg); background: var(--demo-cta-bg); }
.passo-num { font-size: 0.72rem; text-transform: uppercase; letter-spacing: 0.05em; color: var(--demo-text-2); font-weight: 700; }
.trilha { height: 6px; background: var(--demo-border); border-radius: 3px; margin-top: 6px; overflow: hidden; }
.preenchido { height: 100%; background: var(--demo-gradient); transition: width var(--demo-dur) var(--demo-ease); }
.passo-titulo { margin: 4px 0 0; font: var(--demo-font-title); }
.passo-texto { margin: 0; color: var(--demo-text-1); font-size: 1.02rem; }
.coach { margin: 0; padding: 12px 14px; background: color-mix(in srgb, var(--demo-accent) 12%, var(--demo-card)); border-left: 3px solid var(--demo-accent); border-radius: 8px; font-size: 0.9rem; }
.nav { display: flex; justify-content: space-between; gap: 10px; margin-top: 6px; }

.campo { display: flex; flex-direction: column; gap: 8px; }
.rotulo { font-size: 0.88rem; font-weight: 600; display: flex; justify-content: space-between; align-items: center; }
.tag { font-variant-numeric: tabular-nums; color: var(--demo-accent-text); font-weight: 800; }
.valor-in { display: flex; align-items: center; gap: 6px; background: var(--demo-card); border: 1px solid var(--demo-border); border-radius: 10px; padding: 9px 13px; }
.prefixo { color: var(--demo-text-2); font-weight: 700; }
.valor-in input { border: 0; background: transparent; color: var(--demo-text-1); font-size: 1.15rem; font-weight: 800; font-variant-numeric: tabular-nums; width: 100%; outline: none; }
input[type="range"] { width: 100%; accent-color: var(--demo-cta-bg); }
.segmentos { display: flex; gap: 8px; }
.segmentos button { flex: 1; border: 1px solid var(--demo-border); background: var(--demo-card); color: var(--demo-text-1); border-radius: 10px; padding: 9px; font-weight: 600; cursor: pointer; }
.segmentos button.ativo { border-color: var(--demo-cta-bg); background: var(--demo-cta-bg); color: var(--demo-cta-fg); }

.btn { border: 0; border-radius: 10px; padding: 11px 20px; font-weight: 700; cursor: pointer; transition: transform var(--demo-dur) var(--demo-ease), background var(--demo-dur) var(--demo-ease); }
.btn.primario { background: var(--demo-cta-bg); color: var(--demo-cta-fg); box-shadow: var(--demo-shadow-card); }
.btn.primario:hover { background: var(--demo-cta-hover); transform: translateY(-1px); }
.btn.ghost { background: transparent; color: var(--demo-accent-text); border: 1px solid var(--demo-border); }
.btn:disabled { opacity: 0.4; cursor: not-allowed; }

/* Resultado focal, elevado */
.resultado { display: flex; flex-direction: column; gap: 12px; }
.manchetes { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 480px) { .manchetes { grid-template-columns: 1fr; } }
.manchete { border-radius: var(--demo-radius-sm); padding: 18px 20px; background: var(--demo-card); border: 1px solid var(--demo-border); box-shadow: var(--demo-shadow-card); }
.m-rotulo { display: block; font-size: 0.85rem; color: var(--demo-text-2); font-weight: 600; }
.m-num { display: block; font: var(--demo-num); font-variant-numeric: tabular-nums; white-space: nowrap; letter-spacing: -0.02em; margin-top: 6px; transition: color var(--demo-dur) var(--demo-ease); }
.manchete.fisco.vivo .m-num { color: var(--demo-fisco); }
.manchete.empresa.vivo { border-color: var(--demo-empresa); background: color-mix(in srgb, var(--demo-empresa) 7%, var(--demo-card)); }
.manchete.empresa.vivo .m-num { color: var(--demo-empresa); }
.fluxo { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--demo-border); }
.fluxo-empresa { background: var(--demo-empresa); transition: width var(--demo-dur) var(--demo-ease); }
.fluxo-fisco { background: var(--demo-fisco); transition: width var(--demo-dur) var(--demo-ease); }
.placeholder { margin: 0; padding: 16px 18px; color: var(--demo-text-2); background: var(--demo-surface); border-radius: var(--demo-radius-sm); font-size: 0.9rem; }
.breakdown { background: var(--demo-surface); border-radius: var(--demo-radius-sm); padding: 4px 18px 14px; }
.breakdown summary { cursor: pointer; font-size: 0.85rem; color: var(--demo-text-2); padding: 10px 0; font-weight: 600; }
.linha { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid var(--demo-border); }
.linha.sub { padding-left: 14px; color: var(--demo-text-2); }
.linha.total { font-weight: 700; }
.linha .v { font-variant-numeric: tabular-nums; }

.coluna-codigo { display: flex; flex-direction: column; border: 1px solid var(--demo-border); border-radius: var(--demo-radius-sm); overflow: hidden; background: var(--demo-card); box-shadow: var(--demo-shadow-card); }
.cod-cab { display: flex; align-items: center; justify-content: space-between; padding: 11px 15px; border-bottom: 1px solid var(--demo-border); background: var(--demo-surface); }
.cod-titulo { font-size: 0.76rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--demo-text-2); }
.cod-copiar { border: 1px solid var(--demo-border); background: var(--demo-card); color: var(--demo-accent-text); border-radius: 6px; padding: 4px 11px; font-size: 0.78rem; font-weight: 700; cursor: pointer; }
.cod-bloco { margin: 0; padding: 16px; overflow-x: auto; font-size: 0.82rem; line-height: 1.55; }
.cod-bloco code { font-family: var(--vp-font-family-mono, monospace); color: var(--demo-text-1); white-space: pre; }
.cod-nota { margin: 0; padding: 12px 15px; border-top: 1px solid var(--demo-border); font-size: 0.75rem; color: var(--demo-text-2); }

.aviso { margin: 18px 0 0; font-size: 0.78rem; color: var(--demo-text-2); }

/* Foco de teclado visivel (a11y) */
.demo :focus-visible { outline: 3px solid var(--demo-accent); outline-offset: 2px; border-radius: 6px; }
</style>
