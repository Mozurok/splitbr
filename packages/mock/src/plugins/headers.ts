import type { FastifyInstance } from "fastify";
import { conferirFormaDoHeader } from "@splitbr/client";
import { sendProblem } from "./problem.js";

/**
 * Headers do contrato v1.1.0.
 *
 * O v0.0.10 exigia quatro headers (messageId, correlationId, tenantId,
 * timestamp) e o v1.1.0 não declara nenhum deles: sumiram de
 * `components.parameters` e não aparecem uma única vez no Manual de Integração
 * v1.1.0. No lugar entrou o `X-JWS-Signature`, `required` nas 43 operações.
 *
 * O que este plugin faz, e por quê:
 *
 * - **Não exige mais os quatro antigos.** Exigi-los deixaria o mock mais
 *   estrito que a plataforma real, que é o defeito oposto ao que um mock deve
 *   ter. Ainda são aceitos, e o `correlationId` continua sendo ecoado na
 *   resposta quando vem, porque é útil para depurar uma jornada.
 * - **Valida a FORMA do `X-JWS-Signature` quando ele vem, sem exigir que
 *   venha.** Verificação criptográfica de verdade obrigaria quem roda
 *   `npx splitbr-mock` a gerar par de chaves RSA antes de ver a primeira
 *   resposta, e o valor do mock é justamente não precisar de setup. Já aceitar
 *   qualquer string não ensinaria nada: o erro mais provável em produção é
 *   mandar um JWS bem-formado com `b64` errado, ou com o payload anexado em vez
 *   de detached, e conferir a forma pega exatamente isso.
 * - **`exigirAssinatura` fecha a porta** para quem quer o comportamento fiel ao
 *   contrato, inclusive em CI.
 */
export interface OpcoesDeHeaders {
  /** Recusa requisição sem `X-JWS-Signature` (400). Padrão: false. */
  exigirAssinatura?: boolean;
}

export function headersPlugin(app: FastifyInstance, opcoes: OpcoesDeHeaders = {}): void {
  const exigir = opcoes.exigirAssinatura ?? false;

  app.addHook("onRequest", (request, reply, done) => {
    if (!request.url.startsWith("/api/")) {
      done();
      return;
    }

    const bruto = request.headers["x-jws-signature"];
    const assinatura = Array.isArray(bruto) ? bruto[0] : bruto;

    if (assinatura === undefined || assinatura === "") {
      if (exigir) {
        sendProblem(reply, {
          status: 400,
          title: "Assinatura ausente",
          detail:
            "Header 'X-JWS-Signature' ausente. O contrato v1.1.0 exige assinatura JWS Compact Detached em todas as operações (Manual de Integração v1.1.0, capítulo 8).",
          extensions: { header: "X-JWS-Signature" },
        });
        done();
        return;
      }
    } else {
      const { problemas } = conferirFormaDoHeader(assinatura);
      if (problemas.length > 0) {
        sendProblem(reply, {
          status: 400,
          title: "Assinatura malformada",
          detail: `Header 'X-JWS-Signature' não está conforme o capítulo 8 do Manual de Integração v1.1.0: ${problemas.join("; ")}.`,
          extensions: { header: "X-JWS-Signature", problemas },
        });
        done();
        return;
      }
    }

    // Herança do v0.0.10: o correlationId não é mais contrato, mas ecoá-lo
    // quando vem continua ajudando a seguir uma jornada nos logs.
    const correlation = request.headers["correlationid"];
    if (correlation !== undefined) {
      reply.header("correlationId", Array.isArray(correlation) ? correlation[0] : correlation);
    }
    done();
  });
}
