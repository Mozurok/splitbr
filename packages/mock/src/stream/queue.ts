import { EventEmitter } from "node:events";
import type { Arranjo } from "../domain/matrices.js";

/**
 * Pull-based event streaming do Manual (secoes 3.6/3.7): eventos por
 * (arranjo, idPsp) com NSU sequencial; leitura por cursor via token opaco com
 * CLAIM ATOMICO (reuso concorrente perde); long polling com resolucao
 * imediata. Cada stream mantem um LEDGER dos NSUs que entregou, o que da
 * semantica real aos 3 modos da consulta retroativa (o retroativo devolve
 * "mensagens ja entregues anteriormente", nunca um tail vivo).
 */
export interface EventoTributo {
  nsuId: number;
  [campo: string]: unknown;
}

interface EstadoStream {
  arranjo: Arranjo;
  idPsp: string;
  /** Proximo NSU a ler (exclusivo do ja entregue). */
  pos: number;
  streamId: string;
  retroativo: boolean;
  /** Limite superior inclusivo (toNsu, ledger de stream fechada ou snapshot). */
  ateNsu?: number;
  /** Retroativo por streamId: so NSUs que AQUELE stream entregou. */
  somenteNsus?: Set<number>;
  /** Marcado por DELETE; mata polls em voo e impede nova rotacao. */
  encerrado?: boolean;
}

interface HistoricoStream {
  arranjo: Arranjo;
  idPsp: string;
  nsusEntregues: Set<number>;
}

export class FilaEventos {
  private readonly filas = new Map<string, EventoTributo[]>();
  private readonly streams = new Map<string, EstadoStream>();
  /** Tokens reivindicados por um poll em andamento (claim atomico). */
  private readonly emVoo = new Map<string, EstadoStream>();
  /** Ledger permanente por streamId (sobrevive ao DELETE, alimenta o retroativo). */
  private readonly historico = new Map<string, HistoricoStream>();
  private readonly sinais = new EventEmitter();
  private contadorToken: number;
  private contadorStream: number;

  constructor(seed = 1) {
    this.contadorToken = seed * 100;
    this.contadorStream = seed * 10;
    this.sinais.setMaxListeners(0);
  }

  private chave(arranjo: Arranjo, idPsp: string): string {
    return `${arranjo}:${idPsp}`;
  }

  publicar(arranjo: Arranjo, idPsp: string, dados: Record<string, unknown>): EventoTributo {
    const chave = this.chave(arranjo, idPsp);
    const fila = this.filas.get(chave) ?? [];
    const evento: EventoTributo = { ...dados, nsuId: fila.length + 1 };
    fila.push(evento);
    this.filas.set(chave, fila);
    this.sinais.emit(chave);
    return evento;
  }

  private novoToken(prefixo: "S" | "R"): string {
    this.contadorToken += 1;
    return `${prefixo}${this.contadorToken.toString(36)}`;
  }

  abrirStream(arranjo: Arranjo, idPsp: string): { token: string; estado: EstadoStream } {
    this.contadorStream += 1;
    const streamId = `STREAM-${this.contadorStream}`;
    const estado: EstadoStream = { arranjo, idPsp, pos: 0, streamId, retroativo: false };
    this.historico.set(streamId, { arranjo, idPsp, nsusEntregues: new Set() });
    const token = this.novoToken("S");
    this.streams.set(token, estado);
    return { token, estado };
  }

  /**
   * Os 3 modos do manual: (1) fromNsu[+toNsu] sobre tudo ja entregue na chave;
   * (2)/(3) com streamId: so os NSUs que aquele stream entregou. Sem toNsu o
   * teto e um SNAPSHOT do ja entregue no momento da abertura (nunca tail vivo).
   * streamId desconhecido retorna null (rota responde 422).
   */
  abrirRetroativo(
    arranjo: Arranjo,
    idPsp: string,
    fromNsu: number,
    toNsu?: number,
    streamId?: string,
  ): { token: string; estado: EstadoStream } | null {
    let somenteNsus: Set<number> | undefined;
    if (streamId !== undefined) {
      const hist = this.historico.get(streamId);
      if (!hist || hist.arranjo !== arranjo || hist.idPsp !== idPsp) return null;
      somenteNsus = hist.nsusEntregues;
    }
    const teto =
      toNsu ??
      (somenteNsus && somenteNsus.size > 0
        ? Math.max(...somenteNsus)
        : this.maxNsuEntregue(arranjo, idPsp));
    this.contadorStream += 1;
    const estado: EstadoStream = {
      arranjo,
      idPsp,
      pos: fromNsu - 1,
      streamId: streamId ?? `STREAM-${this.contadorStream}`,
      retroativo: true,
      ateNsu: teto,
      ...(somenteNsus ? { somenteNsus } : {}),
    };
    const token = this.novoToken("R");
    this.streams.set(token, estado);
    return { token, estado };
  }

  private maxNsuEntregue(arranjo: Arranjo, idPsp: string): number {
    let max = 0;
    for (const h of this.historico.values()) {
      if (h.arranjo === arranjo && h.idPsp === idPsp) {
        for (const n of h.nsusEntregues) if (n > max) max = n;
      }
    }
    return max;
  }

  obterEstado(token: string): EstadoStream | undefined {
    return this.streams.get(token);
  }

  /** DELETE do manual: mata o stream, inclusive um poll em voo. O ledger fica. */
  encerrar(token: string): boolean {
    const estado = this.streams.get(token) ?? this.emVoo.get(token);
    if (!estado) return false;
    estado.encerrado = true;
    this.streams.delete(token);
    return true;
  }

  private disponiveis(estado: EstadoStream, max = 1000): EventoTributo[] {
    const fila = this.filas.get(this.chave(estado.arranjo, estado.idPsp)) ?? [];
    const limite = estado.ateNsu ?? Number.MAX_SAFE_INTEGER;
    return fila
      .filter(
        (e) =>
          e.nsuId > estado.pos &&
          e.nsuId <= limite &&
          (!estado.somenteNsus || estado.somenteNsus.has(e.nsuId)),
      )
      .slice(0, max);
  }

  /**
   * Long polling com claim atomico: o token sai do mapa ANTES de qualquer
   * await, entao reuso concorrente ve "desconhecido" (422) e exatamente um
   * poll vence. DELETE durante o voo marca encerrado e o poll morre sem
   * rotacionar. Streams out registram os NSUs entregues no ledger.
   */
  async consumir(
    token: string,
    timeoutMs: number,
  ): Promise<
    | { resultado: "eventos"; eventos: EventoTributo[]; proximoToken: string; streamId: string }
    | { resultado: "vazio"; proximoToken: string; streamId: string }
    | { resultado: "desconhecido" }
  > {
    const estado = this.streams.get(token);
    if (!estado || estado.encerrado) return { resultado: "desconhecido" };
    this.streams.delete(token);
    this.emVoo.set(token, estado);

    try {
      let eventos = this.disponiveis(estado);
      if (eventos.length === 0 && !estado.retroativo && timeoutMs > 0) {
        const chave = this.chave(estado.arranjo, estado.idPsp);
        const sinais = this.sinais;
        await new Promise<void>((resolve) => {
          const aoPublicar = () => fim();
          const timer = setTimeout(fim, timeoutMs);
          function fim() {
            clearTimeout(timer);
            sinais.off(chave, aoPublicar);
            resolve();
          }
          sinais.once(chave, aoPublicar);
        });
        eventos = this.disponiveis(estado);
      }

      if (estado.encerrado) return { resultado: "desconhecido" };

      const prefixo = estado.retroativo ? "R" : "S";
      const proximoToken = this.novoToken(prefixo);
      if (eventos.length > 0) {
        const ultimo = eventos[eventos.length - 1]!;
        if (!estado.retroativo) {
          const hist = this.historico.get(estado.streamId);
          for (const e of eventos) hist?.nsusEntregues.add(e.nsuId);
        }
        estado.pos = ultimo.nsuId;
        this.streams.set(proximoToken, estado);
        return { resultado: "eventos", eventos, proximoToken, streamId: estado.streamId };
      }
      this.streams.set(proximoToken, estado);
      return { resultado: "vazio", proximoToken, streamId: estado.streamId };
    } finally {
      this.emVoo.delete(token);
    }
  }
}
