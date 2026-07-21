import type { Arranjo } from "../domain/matrices.js";
import { SegregacaoFsm } from "../domain/segregacao-fsm.js";
import { FilaEventos } from "../stream/queue.js";

export type StatusTransacao = "iniciada" | "atualizada" | "baixada" | "paga";

export interface Transacao {
  arranjo: Arranjo;
  chave: string;
  status: StatusTransacao;
  dados: Record<string, unknown>;
}

/**
 * Chave natural da transacao por arranjo (campos M das matrizes): boleto usa
 * numCtrlOrig; Pix Automatico/Dinamico usam txId; no informe preliminar,
 * Pix Estatico usa e2eId e TED/TEF os numeros de controle proprios.
 */
export function chaveTransacao(
  arranjo: Arranjo,
  item: Record<string, unknown>,
): string | undefined {
  const campo: Record<Arranjo, string> = {
    boleto: "numCtrlOrig",
    "pix-automatico": "txId",
    "pix-dinamico": "txId",
    "pix-estatico": "e2eId",
    ted: "numCtrlTED",
    tef: "numCtrlTEF",
  };
  const valor = item[campo[arranjo]];
  return typeof valor === "string" ? valor : undefined;
}

/** Estado in-memory do mock; deterministico por seed (D-3), zera por processo. */
export class MemoryStore {
  readonly seed: number;
  private contadorResource: number;
  readonly transacoes = new Map<string, Transacao>();
  readonly segregacao = new SegregacaoFsm();
  readonly eventos: FilaEventos;

  constructor(seed = 1) {
    this.seed = seed;
    this.contadorResource = seed * 1000;
    this.eventos = new FilaEventos(seed);
  }

  proximoResourceId(): string {
    this.contadorResource += 1;
    return `RES${String(this.contadorResource).padStart(13, "0")}`;
  }

  private idx(arranjo: Arranjo, chave: string): string {
    return `${arranjo}:${chave}`;
  }

  obterTransacao(arranjo: Arranjo, chave: string): Transacao | undefined {
    return this.transacoes.get(this.idx(arranjo, chave));
  }

  gravarTransacao(t: Transacao): void {
    this.transacoes.set(this.idx(t.arranjo, t.chave), t);
  }
}
