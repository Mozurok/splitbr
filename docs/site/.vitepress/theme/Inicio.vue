<script setup lang="ts">
/**
 * Pagina inicial do tema "lambe-lambe".
 *
 * Tres atos: o muro (cartazes colados no carregamento), o rasgo (um boleto de
 * R$ 1.000,00 que se rasga em tres tiras conforme a rolagem) e o mural (um
 * cartaz por publico). Os valores das tiras saem da calcularSegregacao
 * publicada, pelo mesmo motor da demo, sobre o caso do tutorial.
 *
 * O HTML ja nasce no estado final (boleto rasgado, cartazes colados). A
 * animacao so roda com prefers-reduced-motion: no-preference e, nesse caso,
 * reconstroi o estado inicial com gsap.from. Sem JS ou com movimento reduzido,
 * a pagina fica completa e estatica. GSAP e importado so no cliente.
 */
import { onBeforeUnmount, onMounted, ref } from "vue";
import { withBase } from "vitepress";
import DemoSplit from "./DemoSplit.vue";
import { calcularSplit, formatarBRL } from "./demo/engine.js";
import { cicloFeliz } from "./demo/dados.js";

const caso = cicloFeliz.segregacao;
const r = calcularSplit(caso);
/** Valor em reais com espaco que nao quebra: "R$" nunca fica sozinho no fim da linha. */
const brl = (centavos: number) => formatarBRL(centavos).replace(" ", "\u00a0");

/**
 * Bordas rasgadas que se encaixam. Cada corte e uma serie de deslocamentos em
 * px dentro de uma faixa de RASGO px; a tira de cima termina nesses pontos e a
 * de baixo comeca neles, com margin-top negativo do tamanho da faixa. Antes do
 * rasgo as tiras se encaixam sem fresta. Pseudoaleatorio com semente fixa,
 * para o SSR e o cliente gerarem a mesma borda.
 */
const RASGO = 14;
function corte(semente: number, pontos = 28): number[] {
  let s = semente;
  const prox = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
  return Array.from({ length: pontos + 1 }, () => Math.round(prox() * RASGO));
}
function clip(cima: number[] | null, baixo: number[] | null): string {
  const n = (cima ?? baixo)!.length - 1;
  const topo = cima
    ? cima.map((d, i) => `${((i / n) * 100).toFixed(2)}% ${d}px`)
    : ["0% 0%", "100% 0%"];
  const base = baixo
    ? baixo.map((d, i) => `${((i / n) * 100).toFixed(2)}% calc(100% - ${RASGO - d}px)`).reverse()
    : ["100% 100%", "0% 100%"];
  return `polygon(${[...topo, ...base].join(", ")})`;
}
const corteA = corte(7);
const corteB = corte(23);
const clips = [clip(null, corteA), clip(corteA, corteB), clip(corteB, null)];

const raiz = ref<HTMLElement | null>(null);
let desfazer: (() => void) | undefined;

onMounted(async () => {
  const { gsap } = await import("gsap");
  const { ScrollTrigger } = await import("gsap/ScrollTrigger");
  gsap.registerPlugin(ScrollTrigger);
  const mm = gsap.matchMedia(raiz.value ?? undefined);

  mm.add("(prefers-reduced-motion: no-preference)", () => {
    // Ato 1: os cartazes sao colados de cima para baixo, um de cada vez.
    gsap.from(".colado", {
      clipPath: "inset(0% 0% 100% 0%)",
      duration: 0.9,
      ease: "power3.out",
      stagger: 0.14,
      delay: 0.1,
    });
    gsap.from(".selo", { scale: 0, rotation: -40, duration: 0.7, ease: "back.out(2)", delay: 0.75 });

    // Ato 2: o boleto inteiro, depois rasgado, conforme a rolagem.
    const tl = gsap.timeline({
      scrollTrigger: { trigger: ".rasgo", start: "top top", end: "+=160%", pin: true, scrub: 0.6 },
    });
    tl.from(".tira", { x: 0, y: 0, rotation: 0, backgroundColor: "#fbfaf6", color: "#000000", duration: 1, stagger: 0.08 }, 0.35)
      .from(".tira .antes", { opacity: 1, duration: 0.3 }, 0.35)
      .from(".tira .depois", { opacity: 0, duration: 0.35 }, 0.75)
      .from(".legenda.depois", { opacity: 0, y: 24, duration: 0.35 }, 0.8)
      .fromTo(".legenda.antes", { opacity: 1, y: 0 }, { opacity: 0, y: -24, duration: 0.3 }, 0.3)
      .to({}, { duration: 0.3 });
  });

  desfazer = () => mm.revert();
});
onBeforeUnmount(() => desfazer?.());

const mural = [
  {
    classe: "m-empresa",
    chamada: "Tenho empresa",
    sub: "ou sou contador",
    texto: "O que muda no seu caixa, quem é alcançado e o que perguntar ao seu contador. Sem código: quem conversa com a plataforma é o banco da sua empresa.",
    acao: "Ler o guia",
    link: "/split-payment",
  },
  {
    classe: "m-dev",
    chamada: "Rode na sua máquina",
    sub: "npx @splitbr/mock",
    texto: "A plataforma inteira em um comando, fiel ao contrato oficial: os sete fluxos, os erros, a segregação em três passos. Sem licença.",
    acao: "Fazer o tutorial",
    link: "/tutorial",
  },
  {
    classe: "m-psp",
    chamada: "Integro como PSP",
    sub: "@splitbr/client",
    texto: "SDK TypeScript gerado do OpenAPI oficial, com a assinatura X-JWS-Signature em cada requisição e a chave privada sempre do seu lado.",
    acao: "Ver a referência",
    link: "/referencia/client",
  },
  {
    classe: "m-novidade",
    chamada: "Contrato v1.1.1",
    sub: "publicado em 24/09/2026",
    texto: "O governo publicou o OpenAPI v1.1.1 e os manuais de Segurança, Redes e Habilitação. Os pacotes já seguem a versão nova.",
    acao: "Ver as novidades",
    link: "/novidades",
  },
];
</script>

<template>
  <div ref="raiz" class="lambe">
    <!-- ATO 1: o muro -->
    <section class="muro" aria-labelledby="manchete">
      <div class="parede">
        <div class="cartaz-mestre colado">
          <h1 id="manchete" class="manchete"><span>O imposto sai</span> <span>na hora do</span> <span>pagamento.</span></h1>
        </div>

        <div class="cartaz-lei colado">
          <p class="lei-titulo">Split payment</p>
          <p class="lei-texto">
            Reforma Tributária, LC 214/2025. A CBS e o IBS vão ser separados no momento em que o cliente paga,
            antes de o dinheiro chegar à conta de quem vendeu.
          </p>
        </div>

        <div class="cartaz-cmd colado">
          <code>npx @splitbr/mock</code>
          <span>a plataforma inteira na sua máquina</span>
        </div>

        <p class="selo" aria-hidden="true"><span>Sem<br />precisar<br />ser banco</span></p>
      </div>

      <div class="muro-rodape">
        <p class="lide">
          O splitbr explica o split payment em português claro e deixa qualquer pessoa simular, com o contrato
          oficial do governo como fonte.
        </p>
        <div class="acoes">
          <a class="acao principal" href="#rasgo">Ver o imposto sair</a>
          <a class="acao" :href="withBase('/split-payment')">Ler o guia</a>
        </div>
      </div>
    </section>

    <!-- ATO 2: o rasgo -->
    <section id="rasgo" class="rasgo" aria-labelledby="rasgo-titulo">
      <div class="rasgo-miolo">
        <div class="rasgo-texto">
          <h2 id="rasgo-titulo" class="sr-only">Como o pagamento se divide</h2>
          <p class="legenda antes" aria-hidden="true">Seu cliente paga um boleto de {{ brl(caso.valorPagoCentavos) }}.</p>
          <div class="legenda depois">
            <p class="legenda-grande">Na mesma hora, o pagamento se divide em três.</p>
            <p class="legenda-nota">
              Alíquota de teste de 2026 (0,9% de CBS e 0,1% de IBS). Cada valor sai da
              <code>calcularSegregacao()</code> publicada no <code>@splitbr/client</code>.
            </p>
          </div>
        </div>

        <div class="boleto" role="img" :aria-label="`Boleto de ${brl(caso.valorPagoCentavos)} dividido: ${brl(r.sobrouParaEmpresaCentavos)} para você, ${brl(r.cbsCentavos)} de CBS para a União e ${brl(r.ibsCentavos)} de IBS para estados e municípios`">
          <div class="tira t-voce" :style="{ clipPath: clips[0] }">
            <div class="antes"><span class="b-rotulo">Boleto pago</span><span class="b-banco">Banco do seu cliente</span></div>
            <div class="depois"><span class="t-quem">Você recebe</span><span class="t-valor">{{ brl(r.sobrouParaEmpresaCentavos) }}</span></div>
          </div>
          <div class="tira t-cbs" :style="{ clipPath: clips[1] }">
            <div class="antes"><span class="b-valor">{{ brl(caso.valorPagoCentavos) }}</span></div>
            <div class="depois"><span class="t-quem">CBS para a União</span><span class="t-valor">{{ brl(r.cbsCentavos) }}</span></div>
          </div>
          <div class="tira t-ibs" :style="{ clipPath: clips[2] }">
            <div class="antes"><span class="b-barras" /><span class="b-linha">34191.79001 01043.510047 91020.150008 1 00010000100000</span></div>
            <div class="depois"><span class="t-quem">IBS para estados e municípios</span><span class="t-valor">{{ brl(r.ibsCentavos) }}</span></div>
          </div>
        </div>
      </div>
    </section>

    <!-- ATO 3: o mural -->
    <section class="mural" aria-labelledby="mural-titulo">
      <h2 id="mural-titulo" class="titulo-secao">Por onde começar</h2>
      <div class="mural-grade">
        <a v-for="m in mural" :key="m.link" :class="['poster', m.classe]" :href="withBase(m.link)">
          <span class="p-chamada">{{ m.chamada }}</span>
          <span class="p-sub">{{ m.sub }}</span>
          <span class="p-texto">{{ m.texto }}</span>
          <span class="p-acao">{{ m.acao }}</span>
        </a>
      </div>
    </section>

    <!-- Demo -->
    <section id="simulador" class="simulador" aria-labelledby="sim-titulo">
      <h2 id="sim-titulo" class="titulo-secao">Siga uma venda do começo ao fim</h2>
      <p class="sim-lide">
        Cinco passos, da nota ao retorno do fisco. Depois troque os valores e veja a conta mudar.
      </p>
      <DemoSplit />
    </section>

    <!-- Manifesto -->
    <section class="manifesto" aria-labelledby="manif-titulo">
      <div class="manif-miolo">
        <h2 id="manif-titulo" class="manif-titulo">O contrato oficial é a fonte da verdade.</h2>
        <div class="manif-colunas">
          <p>
            A Plataforma Pública do Split Payment só aceita PSPs homologados, e até julho de 2026 não havia nenhuma
            ferramenta aberta para quem precisa se preparar: bancos, fintechs, ERPs, software houses e as próprias
            empresas.
          </p>
          <p>
            O splitbr guarda o contrato do governo com hash pinado. Quando sai uma versão nova, o build quebra em
            vez de mentir. Hoje os pacotes seguem o OpenAPI v1.1.1. O que mudou e quando está no
            <a :href="withBase('/estado-regulacao')">estado da regulação</a>.
          </p>
        </div>
      </div>
    </section>
  </div>
</template>

<style scoped>
.lambe {
  --miolo: min(1240px, 100% - clamp(32px, 6vw, 96px));
  --ritmo: clamp(80px, 11vw, 160px);
  color: var(--lb-tinta);
  overflow-x: clip;
}
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

/* Textura de papel em toda superficie de cartaz. */
.cartaz-mestre,
.cartaz-lei,
.cartaz-cmd,
.tira,
.poster {
  position: relative;
  isolation: isolate;
}
.cartaz-mestre::after,
.cartaz-lei::after,
.tira::after,
.poster::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--lb-grao);
  mix-blend-mode: multiply;
  opacity: 0.35;
  pointer-events: none;
  z-index: 1;
}

/* ===== ATO 1: muro ===== */
.muro {
  width: var(--miolo);
  margin-inline: auto;
  padding-top: clamp(24px, 4vw, 48px);
  padding-bottom: var(--ritmo);
}
.parede {
  position: relative;
  display: grid;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: start;
}
.cartaz-mestre {
  container-type: inline-size;
  grid-column: 1 / span 10;
  grid-row: 1;
  background: var(--lb-lambe);
  color: #000;
  padding: clamp(24px, 4vw, 56px) clamp(20px, 3.5vw, 48px) clamp(28px, 5vw, 72px);
  transform: rotate(-1deg);
  box-shadow: 0 2px 0 rgba(0, 0, 0, 0.15);
}
.manchete {
  position: relative;
  z-index: 2;
  margin: 0;
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  /* Tamanho pela largura do cartaz: a linha mais longa ocupa o cartaz todo. */
  font-size: 15.2cqi;
  line-height: 0.84;
  letter-spacing: -0.01em;
}
.manchete span {
  display: block;
  white-space: nowrap;
}
.cartaz-lei {
  grid-column: 9 / span 4;
  grid-row: 1;
  align-self: end;
  margin-bottom: -8%;
  background: var(--lb-papel);
  color: var(--lb-tinta);
  border: 2px solid var(--lb-tinta);
  padding: 22px 22px 26px;
  transform: rotate(2.2deg);
  z-index: 3;
}
.lei-titulo {
  position: relative;
  z-index: 2;
  margin: 0 0 10px;
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(2.2rem, 3.6vw, 3.2rem);
  line-height: 0.86;
}
.lei-texto {
  position: relative;
  z-index: 2;
  margin: 0;
  font-size: 0.98rem;
  line-height: 1.5;
}
.cartaz-cmd {
  grid-column: 2 / span 5;
  grid-row: 2;
  margin-top: -18px;
  background: #000;
  color: var(--lb-amarelo);
  padding: 16px 20px;
  transform: rotate(1.4deg);
  display: flex;
  flex-direction: column;
  gap: 4px;
  z-index: 3;
  justify-self: start;
}
.cartaz-cmd code {
  font-size: clamp(1.05rem, 2vw, 1.4rem);
  font-weight: 700;
  background: none;
  color: inherit;
  padding: 0;
}
.cartaz-cmd span {
  color: #f4f1e8;
  font-size: 0.9rem;
}
.selo {
  position: absolute;
  right: 18%;
  top: -18px;
  z-index: 4;
  width: clamp(124px, 13vw, 168px);
  aspect-ratio: 1;
  margin: 0;
  display: grid;
  place-items: center;
  background: var(--lb-azul);
  color: #fff;
  text-align: center;
  font-stretch: 70%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(1rem, 1.5vw, 1.3rem);
  line-height: 0.92;
  transform: rotate(12deg);
  /* Selo serrilhado, como as etiquetas de preco coladas por cima. */
  clip-path: polygon(50% 0%, 59% 9%, 71% 4%, 75% 16%, 88% 15%, 87% 28%, 98% 34%, 92% 45%, 100% 55%, 90% 63%, 94% 75%, 81% 78%, 79% 91%, 66% 89%, 58% 100%, 50% 92%, 42% 100%, 34% 89%, 21% 91%, 19% 78%, 6% 75%, 10% 63%, 0% 55%, 8% 45%, 2% 34%, 13% 28%, 12% 15%, 25% 16%, 29% 4%, 41% 9%);
}
.muro-rodape {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 24px 48px;
  align-items: end;
  margin-top: clamp(40px, 6vw, 72px);
}
.lide {
  margin: 0;
  max-width: 46ch;
  font-size: clamp(1.1rem, 1.7vw, 1.3rem);
  line-height: 1.5;
  font-weight: 500;
}
.acoes {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
.acao {
  display: inline-block;
  padding: 14px 24px;
  border: 3px solid var(--lb-tinta);
  color: var(--lb-tinta);
  font-stretch: 80%;
  font-weight: 800;
  font-size: 1.05rem;
  text-transform: uppercase;
  text-decoration: none;
  transition: transform 160ms ease, background-color 160ms ease, color 160ms ease;
}
.acao:hover {
  transform: rotate(-1.5deg);
}
.acao.principal {
  background: var(--lb-tinta);
  color: var(--lb-muro);
}
.acao.principal:hover {
  background: var(--lb-azul);
  border-color: var(--lb-azul);
  color: #fff;
}

@media (max-width: 760px) {
  .cartaz-mestre {
    grid-column: 1 / -1;
  }
  .cartaz-lei {
    grid-column: 2 / -1;
    grid-row: 2;
    margin: -12px 0 0;
  }
  .cartaz-cmd {
    grid-column: 1 / span 11;
    grid-row: 3;
    margin-top: -10px;
  }
  .selo {
    top: auto;
    right: 1%;
    bottom: -28px;
    width: 104px;
    font-size: 0.9rem;
  }
  .muro-rodape {
    grid-template-columns: 1fr;
  }
}

/* ===== ATO 2: rasgo ===== */
.rasgo {
  min-height: 100svh;
  display: grid;
  align-items: center;
  background: var(--lb-tinta);
  color: var(--lb-muro);
}
.rasgo-miolo {
  width: var(--miolo);
  margin-inline: auto;
  display: grid;
  grid-template-columns: minmax(0, 5fr) minmax(0, 7fr);
  gap: clamp(32px, 6vw, 96px);
  align-items: center;
  padding-block: clamp(56px, 8vw, 96px);
}
.rasgo-texto {
  display: grid;
  min-width: 0;
}
.legenda {
  grid-area: 1 / 1;
  margin: 0;
}
.legenda.antes {
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(2.4rem, 5vw, 4.4rem);
  line-height: 0.88;
  opacity: 0;
}
.legenda-grande {
  margin: 0;
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(2.4rem, 5vw, 4.4rem);
  line-height: 0.88;
}
.legenda-nota {
  margin: 20px 0 0;
  max-width: 40ch;
  color: var(--lb-muro-2);
  opacity: 0.8;
  line-height: 1.5;
}
.legenda-nota code {
  background: none;
  padding: 0;
  color: var(--lb-amarelo);
}
.boleto {
  display: flex;
  flex-direction: column;
  min-width: 0;
}
.tira {
  color: #000;
  padding: 26px clamp(20px, 3vw, 36px);
  min-height: clamp(104px, 13vw, 150px);
  display: grid;
}
.tira + .tira {
  margin-top: -14px; /* = RASGO: as bordas rasgadas se encaixam */
}
.tira .antes,
.tira .depois {
  grid-area: 1 / 1;
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16px;
}
.tira .antes {
  opacity: 0;
}
/* Estado final, sem animacao: tiras afastadas, coloridas, com o valor. */
.t-voce {
  background: var(--lb-amarelo);
  transform: translate(-3%, 0) rotate(-2deg);
}
.t-cbs {
  background: var(--lb-azul);
  color: #fff;
  transform: translate(7%, 30px) rotate(1.6deg);
}
.t-ibs {
  background: var(--lb-rosa);
  transform: translate(-1%, 62px) rotate(-1.2deg);
}
.t-quem {
  font-stretch: 75%;
  font-weight: 800;
  text-transform: uppercase;
  font-size: clamp(1rem, 1.6vw, 1.3rem);
  line-height: 1;
  max-width: 14ch;
}
.t-valor {
  font-stretch: 62%;
  font-weight: 900;
  font-size: clamp(2.2rem, 5.4vw, 4.6rem);
  line-height: 0.9;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}
.b-rotulo,
.b-valor {
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
}
.b-rotulo {
  font-size: clamp(1.8rem, 3vw, 2.6rem);
}
.b-banco {
  font-size: 0.85rem;
  color: #3c3a35;
}
.b-valor {
  font-size: clamp(3rem, 6.4vw, 5.6rem);
  line-height: 0.9;
}
.tira .antes:has(.b-barras) {
  flex-direction: column;
  align-items: stretch;
  gap: 8px;
}
.b-barras {
  height: 44px;
  background: repeating-linear-gradient(90deg, #000 0 2px, transparent 2px 4px, #000 4px 7px, transparent 7px 9px, #000 9px 10px, transparent 10px 13px);
}
.b-linha {
  font-family: var(--vp-font-family-mono);
  font-size: 0.72rem;
  letter-spacing: 0.02em;
  color: #3c3a35;
  overflow: hidden;
  white-space: nowrap;
}

@media (max-width: 860px) {
  .rasgo-miolo {
    grid-template-columns: minmax(0, 1fr);
    gap: 28px;
  }
  .legenda.antes,
  .legenda-grande {
    font-size: clamp(2.2rem, 9vw, 3.2rem);
  }
  .tira {
    min-height: 0;
    padding: 20px 18px 22px;
  }
  .tira .depois {
    flex-direction: column;
    align-items: flex-start;
    gap: 6px;
  }
  .t-voce {
    transform: translate(-1%, 0) rotate(-1.5deg);
  }
  .t-cbs {
    transform: translate(2%, 14px) rotate(1.2deg);
  }
  .t-ibs {
    transform: translate(-1%, 28px) rotate(-1deg);
  }
  .b-valor {
    font-size: 3rem;
  }
}

/* ===== ATO 3: mural ===== */
.mural,
.simulador {
  width: var(--miolo);
  margin-inline: auto;
  padding-top: var(--ritmo);
}
.titulo-secao {
  margin: 0 0 clamp(24px, 4vw, 40px);
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(2.8rem, 7vw, 6rem);
  line-height: 0.86;
  border: 0;
  padding: 0;
  text-wrap: balance;
}
.mural-grade {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0;
}
.poster {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: clamp(22px, 3vw, 36px);
  min-height: clamp(300px, 30vw, 420px);
  text-decoration: none;
  color: #000;
  border: 3px solid #000;
  margin: -1.5px;
  transition: transform 180ms ease;
}
.poster:hover {
  transform: rotate(-1deg) scale(1.01);
  z-index: 2;
}
.poster > span {
  position: relative;
  z-index: 2;
}
.p-chamada {
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(2.6rem, 5.2vw, 4.8rem);
  line-height: 0.86;
}
.p-sub {
  font-weight: 700;
  font-size: 1.05rem;
}
.p-texto {
  margin-top: auto;
  max-width: 44ch;
  line-height: 1.5;
  font-size: 0.98rem;
}
.p-acao {
  align-self: flex-start;
  font-stretch: 80%;
  font-weight: 800;
  text-transform: uppercase;
  border-bottom: 3px solid currentColor;
  padding-bottom: 2px;
}
.m-empresa {
  grid-column: span 2;
  background: var(--lb-amarelo);
}
.m-dev {
  background: #000;
  color: #f4f1e8;
}
.m-dev .p-chamada {
  background: var(--lb-lambe);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}
.m-dev .p-sub {
  font-family: var(--vp-font-family-mono);
  color: var(--lb-amarelo);
}
.m-psp {
  background: var(--lb-azul);
  color: #fff;
}
.m-novidade {
  grid-column: span 2;
  background: var(--lb-rosa);
}
@media (max-width: 860px) {
  .mural-grade {
    grid-template-columns: 1fr;
  }
  .m-empresa,
  .m-novidade {
    grid-column: auto;
  }
}

/* ===== Demo ===== */
.sim-lide {
  margin: -8px 0 8px;
  max-width: 56ch;
  font-size: 1.1rem;
  line-height: 1.55;
}

/* ===== Manifesto ===== */
.manifesto {
  margin-top: var(--ritmo);
  background: var(--lb-lambe);
  color: #000;
  position: relative;
  isolation: isolate;
}
.manifesto::after {
  content: "";
  position: absolute;
  inset: 0;
  background-image: var(--lb-grao);
  mix-blend-mode: multiply;
  opacity: 0.35;
  pointer-events: none;
}
.manif-miolo {
  position: relative;
  z-index: 2;
  width: var(--miolo);
  margin-inline: auto;
  padding-block: var(--ritmo);
}
.manif-titulo {
  margin: 0;
  font-stretch: 62%;
  font-weight: 900;
  text-transform: uppercase;
  font-size: clamp(3.2rem, 9vw, 8.4rem);
  line-height: 0.84;
  max-width: 11ch;
  border: 0;
  padding: 0;
  text-wrap: balance;
}
.manif-colunas {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(24px, 4vw, 56px);
  margin-top: clamp(32px, 5vw, 56px);
  font-size: 1.08rem;
  line-height: 1.6;
  font-weight: 500;
}
.manif-colunas p {
  margin: 0;
  max-width: 52ch;
}
.manif-colunas a {
  color: #000;
  text-decoration: underline;
  text-decoration-thickness: 2px;
  text-underline-offset: 3px;
}
@media (max-width: 760px) {
  .manif-colunas {
    grid-template-columns: 1fr;
  }
}

.acao:focus-visible,
.poster:focus-visible,
.manif-colunas a:focus-visible {
  outline: 3px solid var(--lb-azul);
  outline-offset: 4px;
}

@media (prefers-reduced-motion: reduce) {
  .acao,
  .poster {
    transition: none;
  }
  .acao:hover,
  .poster:hover {
    transform: none;
  }
}
</style>
