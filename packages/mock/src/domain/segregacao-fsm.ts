import type { Arranjo } from "./matrices.js";
import { CODIGO_ARRANJO, ID_INF_SEGR, ID_REPASSE } from "./ids.js";

/**
 * Maquina de estados do Informe de Segregacao (Manual secao 3.5, 3 passos):
 * remessa iniciada -> lote(s) de ate 1.000 transacoes -> finalizacao com
 * cross-validacao de totalTrans/valorTotalCbs/valorTotalIbs. Lote com item
 * invalido rejeita o LOTE INTEIRO; passo fora de ordem falha sem mutar estado.
 * Somas monetarias acumulam em centavos inteiros (nunca float).
 */
export type EstadoRemessa = "iniciada" | "finalizada";

export interface Remessa {
  idInfSegr: string;
  idRepasse: string;
  arranjo: Arranjo;
  estado: EstadoRemessa;
  lotes: string[];
  totalTrans: number;
  totalCbsCentavos: bigint;
  totalIbsCentavos: bigint;
  /** Idempotencia (spec: 200 Recebido Anteriormente para replay identico). */
  hashRemessa: string;
  hashesLote: Map<string, string>;
  hashFinalizacao?: string;
  resourceIdRemessa?: string;
  resourceIdsLote: Map<string, string>;
  resourceIdFinalizacao?: string;
}

/** Resultado que distingue replay identico (200) de operacao nova (201). */
export interface ResultadoSegregacao {
  remessa: Remessa;
  replay: boolean;
}

export class ErroSegregacao extends Error {
  constructor(
    readonly status: 422,
    readonly titulo: string,
    detail: string,
    readonly extensoes: Record<string, unknown> = {},
  ) {
    super(detail);
    this.name = "ErroSegregacao";
  }
}

export function paraCentavos(valorReais: number): bigint {
  // Contrato usa decimais em reais (multipleOf 0.01); rounding cobre o ruido
  // binario de ate meio centavo, nunca redefine o valor.
  return BigInt(Math.round(valorReais * 100));
}

export class SegregacaoFsm {
  private readonly remessas = new Map<string, Remessa>();

  iniciarRemessa(
    dados: { idRepasse: string; arrj: string; idInfSegr: string },
    hashPayload: string,
  ): ResultadoSegregacao {
    if (!ID_REPASSE.test(dados.idRepasse)) {
      throw new ErroSegregacao(422, "idRepasse invalido", `idRepasse '${dados.idRepasse}' nao atende ao formato de 30 posicoes do manual`);
    }
    if (!ID_INF_SEGR.test(dados.idInfSegr)) {
      throw new ErroSegregacao(422, "idInfSegr invalido", `idInfSegr '${dados.idInfSegr}' nao atende ao formato de 34 posicoes do manual`);
    }
    const arranjo = (Object.entries(CODIGO_ARRANJO) as Array<[Arranjo, string]>).find(
      ([, cod]) => cod === dados.arrj,
    )?.[0];
    if (!arranjo) {
      throw new ErroSegregacao(422, "arrj invalido", `arrj '${dados.arrj}' fora do enum do contrato`);
    }
    const existente = this.remessas.get(dados.idInfSegr);
    if (existente) {
      if (existente.hashRemessa === hashPayload) return { remessa: existente, replay: true };
      throw new ErroSegregacao(422, "Conflito de remessa", `idInfSegr '${dados.idInfSegr}' ja iniciado com payload diferente`);
    }
    const remessa: Remessa = {
      idInfSegr: dados.idInfSegr,
      idRepasse: dados.idRepasse,
      arranjo,
      estado: "iniciada",
      lotes: [],
      totalTrans: 0,
      totalCbsCentavos: 0n,
      totalIbsCentavos: 0n,
      hashRemessa: hashPayload,
      hashesLote: new Map(),
      resourceIdsLote: new Map(),
    };
    this.remessas.set(dados.idInfSegr, remessa);
    return { remessa, replay: false };
  }

  obter(idInfSegr: string): Remessa | undefined {
    return this.remessas.get(idInfSegr);
  }

  private exigirIniciada(idInfSegr: string, passo: string): Remessa {
    const remessa = this.remessas.get(idInfSegr);
    if (!remessa) {
      // Taxonomia do manual: idInfSegr nao encontrado e 422 de negocio.
      throw new ErroSegregacao(422, "idInfSegr nao encontrado", `Nao ha remessa de segregacao iniciada para '${idInfSegr}' (${passo} fora de ordem)`);
    }
    if (remessa.estado !== "iniciada") {
      throw new ErroSegregacao(422, "Remessa ja finalizada", `Remessa '${idInfSegr}' ja foi finalizada; ${passo} fora de ordem`);
    }
    return remessa;
  }

  /**
   * Passo 2. Valida ANTES de acumular: qualquer item invalido rejeita o lote
   * inteiro e nenhuma transacao do lote entra nos totais.
   */
  receberLote(
    arranjo: Arranjo,
    idInfSegr: string,
    idLote: string,
    transacoes: Array<Record<string, unknown>>,
    errosDosItens: Array<{ index: number; field: string; message: string }>,
    hashPayload: string,
  ): ResultadoSegregacao {
    const remessaExistente = this.remessas.get(idInfSegr);
    const hashAnterior = remessaExistente?.hashesLote.get(idLote);
    if (remessaExistente && hashAnterior !== undefined) {
      if (hashAnterior === hashPayload) return { remessa: remessaExistente, replay: true };
      throw new ErroSegregacao(422, "Conflito de lote", `idLote '${idLote}' ja recebido nesta remessa com payload diferente`);
    }
    const remessa = this.exigirIniciada(idInfSegr, "lote");
    if (remessa.arranjo !== arranjo) {
      throw new ErroSegregacao(422, "Arranjo divergente", `Remessa '${idInfSegr}' foi iniciada para '${remessa.arranjo}', lote chegou em '${arranjo}'`);
    }
    if (transacoes.length === 0 || transacoes.length > 1000) {
      throw new ErroSegregacao(422, "Tamanho de lote invalido", `Lote deve ter entre 1 e 1000 transacoes; recebeu ${transacoes.length}`);
    }
    if (errosDosItens.length > 0) {
      throw new ErroSegregacao(
        422,
        "Lote rejeitado integralmente",
        `${errosDosItens.length} item(ns) invalido(s); o lote inteiro foi rejeitado (manual 3.5.2)`,
        { erros: errosDosItens },
      );
    }
    for (const t of transacoes) {
      remessa.totalCbsCentavos += paraCentavos(t["vlCbsSegr"] as number);
      remessa.totalIbsCentavos += paraCentavos(t["vlIbsSegr"] as number);
    }
    remessa.totalTrans += transacoes.length;
    remessa.lotes.push(idLote);
    remessa.hashesLote.set(idLote, hashPayload);
    return { remessa, replay: false };
  }

  /** Passo 3. Totais devem bater exatamente (comparacao em centavos). */
  finalizar(
    dados: {
      idInfSegr: string;
      totalTrans: number;
      valorTotalCbs: number;
      valorTotalIbs: number;
    },
    hashPayload: string,
  ): ResultadoSegregacao {
    const jaFinalizada = this.remessas.get(dados.idInfSegr);
    if (jaFinalizada?.estado === "finalizada") {
      if (jaFinalizada.hashFinalizacao === hashPayload) return { remessa: jaFinalizada, replay: true };
      throw new ErroSegregacao(422, "Conflito de finalizacao", `Remessa '${dados.idInfSegr}' ja finalizada com payload diferente`);
    }
    const remessa = this.exigirIniciada(dados.idInfSegr, "finalizacao");
    const cbs = paraCentavos(dados.valorTotalCbs);
    const ibs = paraCentavos(dados.valorTotalIbs);
    const divergencias: string[] = [];
    if (dados.totalTrans !== remessa.totalTrans) {
      divergencias.push(`totalTrans informado ${dados.totalTrans} != acumulado ${remessa.totalTrans}`);
    }
    if (cbs !== remessa.totalCbsCentavos) {
      divergencias.push(`valorTotalCbs informado ${cbs} centavos != acumulado ${remessa.totalCbsCentavos}`);
    }
    if (ibs !== remessa.totalIbsCentavos) {
      divergencias.push(`valorTotalIbs informado ${ibs} centavos != acumulado ${remessa.totalIbsCentavos}`);
    }
    if (divergencias.length > 0) {
      throw new ErroSegregacao(422, "Finalizacao divergente", divergencias.join("; "), { divergencias });
    }
    remessa.estado = "finalizada";
    remessa.hashFinalizacao = hashPayload;
    return { remessa, replay: false };
  }
}
