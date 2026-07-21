import type { FastifyInstance } from "fastify";
import { carregarMatriz, type Arranjo } from "../domain/matrices.js";
import { sendProblem } from "../plugins/problem.js";
import type { RegistroSpec } from "../spec/load.js";
import { chaveTransacao, MemoryStore } from "../store/memory.js";
import {
  acharOperacao,
  matrizErroParaItem,
  responderEnvelope,
  validarEntrada,
  type ErroItem,
} from "./util.js";

export interface ContextoRotas {
  store: MemoryStore;
  registro: RegistroSpec;
}

const ARRANJOS_TRANSACAO: Arranjo[] = ["boleto", "pix-automatico", "pix-dinamico"];

/**
 * Fluxos 3.1-3.3 do Manual: Transacao Iniciada (POST), Atualizada (PATCH) e
 * Baixa Exceto Pagamento (POST /baixa-exceto-pagamento), nos 3 arranjos da
 * Etapa 1 com fluxo de transacao.
 */
export function registrarRotasTransacao(app: FastifyInstance, ctx: ContextoRotas): void {
  for (const arranjo of ARRANJOS_TRANSACAO) {
    const base = `/api/v1/${arranjo}`;

    app.post(base, async (request, reply) => {
      const matriz = carregarMatriz("transacao-iniciada");
      const entrada = validarEntrada(request, reply, acharOperacao(ctx.registro, "post", base), matriz, arranjo);
      if (!entrada) return;
      const erros: ErroItem[] = entrada.errosItem.map(matrizErroParaItem);
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
        ctx.store.gravarTransacao({ arranjo, chave, status: "iniciada", dados: item });
        validos += 1;
      });
      return responderEnvelope(reply, ctx.store.proximoResourceId(), validos, erros);
    });

    app.patch(base, async (request, reply) => {
      const matriz = carregarMatriz("transacao-atualizada");
      const entrada = validarEntrada(request, reply, acharOperacao(ctx.registro, "patch", base), matriz, arranjo);
      if (!entrada) return;
      return processarSobreExistentes(reply, ctx, arranjo, entrada.body, entrada.errosItem.map(matrizErroParaItem), (t, item) => {
        t.status = "atualizada";
        t.dados = { ...t.dados, ...item };
        return null;
      });
    });

    app.post(`${base}/baixa-exceto-pagamento`, async (request, reply) => {
      const matriz = carregarMatriz("baixa");
      const entrada = validarEntrada(
        request,
        reply,
        acharOperacao(ctx.registro, "post", `${base}/baixa-exceto-pagamento`),
        matriz,
        arranjo,
      );
      if (!entrada) return;
      return processarSobreExistentes(reply, ctx, arranjo, entrada.body, entrada.errosItem.map(matrizErroParaItem), (t) => {
        if (t.status === "paga") return "transacao ja paga; baixa exceto pagamento inaplicavel";
        t.status = "baixada";
        return null;
      });
    });
  }
}

/**
 * Processa itens que referenciam transacoes ja registradas. Item com chave
 * desconhecida vira erro; quando TODOS os itens sao desconhecidos a resposta
 * e 404 problem+json (taxonomia do manual); erros de negocio viram 422 quando
 * atingem todos os itens, senao errors[] no envelope 201.
 */
export function processarSobreExistentes(
  reply: Parameters<typeof responderEnvelope>[0],
  ctx: ContextoRotas,
  arranjo: Arranjo,
  body: Record<string, unknown>,
  errosPrevios: ErroItem[],
  aplicar: (t: NonNullable<ReturnType<MemoryStore["obterTransacao"]>>, item: Record<string, unknown>) => string | null,
) {
  const erros = [...errosPrevios];
  const invalidos = new Set(erros.map((e) => e.index));
  const itens = (body["transacoes"] as Array<Record<string, unknown>> | undefined) ?? [];
  let validos = 0;
  let desconhecidos = 0;
  let negocio = 0;
  itens.forEach((item, i) => {
    if (invalidos.has(i)) return;
    const chave = chaveTransacao(arranjo, item);
    const t = chave !== undefined ? ctx.store.obterTransacao(arranjo, chave) : undefined;
    if (!t) {
      desconhecidos += 1;
      erros.push({ index: i, field: "chave", message: "transacao nao encontrada" });
      return;
    }
    const erroNegocio = aplicar(t, item);
    if (erroNegocio) {
      negocio += 1;
      erros.push({ index: i, field: "status", message: erroNegocio });
      return;
    }
    validos += 1;
  });

  if (itens.length > 0 && desconhecidos === itens.length) {
    return sendProblem(reply, {
      status: 404,
      title: "Transacao nao encontrada",
      detail: `Nenhuma das ${itens.length} transacoes referenciadas existe para o arranjo '${arranjo}'`,
      extensions: { arranjo },
    });
  }
  if (itens.length > 0 && negocio === itens.length) {
    return sendProblem(reply, {
      status: 422,
      title: "Regra de negocio violada",
      detail: erros.find((e) => e.field === "status")?.message ?? "regra de negocio",
      extensions: { arranjo, erros },
    });
  }
  return responderEnvelope(reply, ctx.store.proximoResourceId(), validos, erros);
}
