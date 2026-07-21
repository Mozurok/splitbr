/**
 * Categorias de valor do Split Payment (Manual de Operacoes, minuta jun/2026).
 * Informado -> Corrigido -> Em Aberto -> Segregado -> Aplicado.
 */
export type CategoriaValor =
  | "informado"
  | "corrigido"
  | "emAberto"
  | "segregado"
  | "aplicado";

/** Papeis de PSP na plataforma (Manual de Operacoes, secao de taxonomia). */
export type PapelPsp =
  | "psp-recebedor-direto"
  | "psp-recebedor-indireto"
  | "psp-pagador-direto"
  | "psp-pagador-indireto"
  | "prestador-servico-conexao"
  | "prestador-servico-repasse-financeiro"
  | "entidade-liquidante"
  | "psp-intermediador";

/** Tributos segregados de forma independente (sem compensacao cruzada). */
export type Tributo = "cbs" | "ibs";
