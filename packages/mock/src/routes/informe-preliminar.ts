import type { FastifyInstance } from "fastify";
import { carregarMatriz, type Arranjo } from "../domain/matrices.js";
import { chaveTransacao } from "../store/memory.js";
import type { ContextoRotas } from "./transacao.js";
import { processarSobreExistentes } from "./transacao.js";
import {
  acharOperacao,
  matrizErroParaItem,
  responderEnvelope,
  validarEntrada,
  type ErroItem,
} from "./util.js";

const TODOS: Arranjo[] = ["boleto", "pix-automatico", "pix-dinamico", "pix-estatico", "ted", "tef"];
const COM_FLUXO_TRANSACAO = new Set<Arranjo>(["boleto", "pix-automatico", "pix-dinamico"]);

/**
 * Fluxo 3.4 do Manual: Informe Preliminar de Pagamento nos 6 arranjos.
 * Nos arranjos com fluxo de transacao previo, o informe exige transacao
 * conhecida e encerra a janela do Super Inteligente (status 'paga'); baixada
 * fecha a janela (422). Pix Estatico/TED/TEF nao tem informe de transacao
 * previo no contrato, entao registram direto.
 */
export function registrarRotasPreliminar(app: FastifyInstance, ctx: ContextoRotas): void {
  for (const arranjo of TODOS) {
    const rota = `/api/v1/${arranjo}/informe-preliminar-pagamento`;
    app.post(rota, async (request, reply) => {
      const matriz = carregarMatriz("informe-preliminar");
      const entrada = validarEntrada(request, reply, acharOperacao(ctx.registro, "post", rota), matriz, arranjo);
      if (!entrada) return;
      const errosPrevios = entrada.errosItem.map(matrizErroParaItem);

      if (COM_FLUXO_TRANSACAO.has(arranjo)) {
        return processarSobreExistentes(reply, ctx, arranjo, entrada.body, errosPrevios, (t, item) => {
          if (t.status === "baixada") return "janela encerrada por baixa exceto pagamento";
          t.status = "paga";
          t.dados = { ...t.dados, ...item };
          return null;
        });
      }

      const erros: ErroItem[] = [...errosPrevios];
      const invalidos = new Set(erros.map((e) => e.index));
      const itens = (entrada.body["transacoes"] as Array<Record<string, unknown>> | undefined) ?? [];
      let validos = 0;
      itens.forEach((item, i) => {
        if (invalidos.has(i)) return;
        const chave = chaveTransacao(arranjo, item);
        if (chave === undefined) {
          erros.push({ index: i, field: "chave", message: "chave natural da transacao ausente" });
          return;
        }
        ctx.store.gravarTransacao({ arranjo, chave, status: "paga", dados: item });
        validos += 1;
      });
      return responderEnvelope(reply, ctx.store.proximoResourceId(), validos, erros);
    });
  }
}
