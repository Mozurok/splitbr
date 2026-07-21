/** Entrada da formula de segregacao, valores em centavos inteiros (por tributo). */
export interface SegregacaoInput {
  /** Vp: valor pago, em centavos. */
  valorPagoCentavos: number;
  /** Vt: valor original da operacao (sem multas/juros), em centavos. */
  valorOriginalCentavos: number;
  /** Valor informado pelo originador para o tributo, em centavos. */
  informadoCentavos: number;
  /** Valor corrigido pelo governo (substitui o informado quando presente), em centavos. */
  corrigidoCentavos?: number | null;
  /** Em Aberto: teto restante do tributo, em centavos; ausente = fora do min. */
  emAbertoCentavos?: number | null;
}

function exigirCentavos(nome: string, valor: number): bigint {
  if (!Number.isInteger(valor)) {
    throw new RangeError(`${nome} deve ser um numero inteiro de centavos`);
  }
  if (valor < 0) {
    throw new RangeError(`${nome} nao pode ser negativo`);
  }
  return BigInt(valor);
}

/**
 * R = min((Vp/Vt) x C; C; A), truncado PARA BAIXO em centavos, por tributo.
 *
 * C = corrigido quando presente, senao informado. A (Em Aberto) ausente ou null
 * sai do min. Aritmetica inteira em BigInt do inicio ao fim: a divisao inteira
 * de nao-negativos e exatamente o truncamento para baixo exigido pelo Manual
 * de Operacoes; nenhuma operacao de ponto flutuante toca o calculo.
 */
export function calcularSegregacao(input: SegregacaoInput): number {
  const vp = exigirCentavos("valorPagoCentavos", input.valorPagoCentavos);
  const vtNum = input.valorOriginalCentavos;
  if (!Number.isInteger(vtNum)) {
    throw new RangeError("valorOriginalCentavos deve ser um numero inteiro de centavos");
  }
  if (vtNum <= 0) {
    throw new RangeError("valorOriginalCentavos (valor original) deve ser positivo");
  }
  const vt = BigInt(vtNum);
  const c =
    input.corrigidoCentavos !== undefined && input.corrigidoCentavos !== null
      ? exigirCentavos("corrigidoCentavos", input.corrigidoCentavos)
      : exigirCentavos("informadoCentavos", input.informadoCentavos);

  const proporcional = (vp * c) / vt;
  let r = proporcional < c ? proporcional : c;

  if (input.emAbertoCentavos !== undefined && input.emAbertoCentavos !== null) {
    const a = exigirCentavos("emAbertoCentavos", input.emAbertoCentavos);
    if (a < r) r = a;
  }

  return Number(r);
}
