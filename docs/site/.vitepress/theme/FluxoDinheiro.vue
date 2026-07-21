<script setup lang="ts">
// Diagrama estatico do caminho do dinheiro (hoje vs com split), padrao
// Tailscale/Mercury das referencias: comparacao lado a lado, sem JS.
</script>

<template>
  <div class="fluxo">
    <div class="painel">
      <p class="titulo">Hoje, sem split</p>
      <div class="cadeia">
        <div class="no">
          <span class="rotulo">Pagador</span>
          <span class="valor">R$ 1.000</span>
        </div>
        <div class="seta">→</div>
        <div class="no destaque">
          <span class="rotulo">Vendedor recebe tudo</span>
          <span class="valor">R$ 1.000</span>
        </div>
        <div class="seta">→</div>
        <div class="no fraco">
          <span class="rotulo">Imposto recolhido meses depois</span>
          <span class="valor">R$ 10</span>
        </div>
      </div>
    </div>

    <div class="painel comsplit">
      <p class="titulo">Com split payment</p>
      <div class="cadeia">
        <div class="no">
          <span class="rotulo">Pagador</span>
          <span class="valor">R$ 1.000</span>
        </div>
        <div class="seta">→</div>
        <div class="ramos">
          <div class="no destaque">
            <span class="rotulo">Vendedor</span>
            <span class="valor">R$ 990</span>
          </div>
          <div class="no fisco">
            <span class="rotulo">CBS → Receita Federal</span>
            <span class="valor">R$ 9</span>
          </div>
          <div class="no fisco">
            <span class="rotulo">IBS → Comitê Gestor</span>
            <span class="valor">R$ 1</span>
          </div>
        </div>
      </div>
      <p class="nota">Separação automática na liquidação, com a alíquota-teste de 2026 (1%).</p>
    </div>
  </div>
</template>

<style scoped>
.fluxo {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
  margin: 24px 0;
}
@media (max-width: 640px) {
  .fluxo {
    grid-template-columns: 1fr;
  }
}
.painel {
  border: 1px solid var(--vp-c-divider);
  border-radius: 12px;
  padding: 20px;
  background: var(--vp-c-bg-soft);
}
.painel.comsplit {
  border-color: var(--vp-c-brand-2);
  background: var(--vp-c-brand-soft);
}
.titulo {
  font-weight: 700;
  font-size: 0.85rem;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--vp-c-text-2);
  margin: 0 0 14px;
}
.comsplit .titulo {
  color: var(--vp-c-brand-1);
}
.cadeia {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}
.no {
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  padding: 8px 12px;
  display: flex;
  flex-direction: column;
  min-width: 110px;
}
.no .rotulo {
  font-size: 0.75rem;
  color: var(--vp-c-text-2);
}
.no .valor {
  font-weight: 700;
  font-variant-numeric: tabular-nums;
}
.no.destaque {
  border-color: var(--vp-c-brand-2);
}
.no.destaque .valor {
  color: var(--vp-c-brand-1);
}
.no.fisco {
  border-style: dashed;
}
.no.fraco {
  opacity: 0.75;
}
.seta {
  color: var(--vp-c-brand-2);
  font-weight: 700;
}
.ramos {
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.nota {
  margin: 12px 0 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
}
</style>
