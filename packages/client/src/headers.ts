import type { Middleware } from "openapi-fetch";
import { assinarRequisicao, type OpcoesDeAssinatura } from "./assinatura.js";

/**
 * Timestamp no formato que a plataforma usa: ISO 8601 em horário de Brasília
 * com offset literal -03:00, 25 posições, sem milissegundos.
 *
 * No contrato v0.0.10 isto preenchia o header `timestamp`, que não existe mais.
 * Continua exportado porque o formato segue valendo para `infRequisicao.dtHrMsg`,
 * que é campo de corpo em toda requisição do v1.1.0 (exemplo do spec:
 * `2026-03-22T12:00:00-03:00`).
 */
export function gerarTimestampSplit(date: Date = new Date()): string {
  const shifted = new Date(date.getTime() - 3 * 3_600_000);
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    `${shifted.getUTCFullYear()}-${p(shifted.getUTCMonth() + 1)}-${p(shifted.getUTCDate())}` +
    `T${p(shifted.getUTCHours())}:${p(shifted.getUTCMinutes())}:${p(shifted.getUTCSeconds())}-03:00`
  );
}

/**
 * Middleware que assina cada requisição e injeta o `X-JWS-Signature`.
 *
 * Ele reescreve o corpo com os bytes canonicalizados, e isso é essencial, não
 * um detalhe de implementação: a assinatura cobre o payload cru (`b64: false`),
 * então enviar o objeto re-serializado pelo `fetch` produziria bytes diferentes
 * dos assinados. Assinar e enviar precisam sair da mesma serialização.
 *
 * Requisição sem corpo (os GET de consulta e os DELETE de stream) assina o
 * payload vazio: o header é `required` nas 43 operações do contrato, inclusive
 * nessas.
 */
export function assinaturaMiddleware(opcoes: OpcoesDeAssinatura): Middleware {
  return {
    async onRequest({ request }) {
      const bruto = await request.clone().text();
      const temCorpo = bruto.length > 0;

      const { header, corpoCanonicoTexto } = await assinarRequisicao(
        temCorpo ? (JSON.parse(bruto) as unknown) : "",
        opcoes,
      );

      const headers = new Headers(request.headers);
      headers.set("X-JWS-Signature", header);
      if (temCorpo) headers.set("content-type", "application/json");

      // `body` sai do objeto quando nao ha corpo: com exactOptionalPropertyTypes,
      // passar `undefined` explicito nao e o mesmo que omitir a chave.
      const init: RequestInit = {
        method: request.method,
        headers,
        signal: request.signal,
        credentials: request.credentials,
        redirect: request.redirect,
        referrer: request.referrer,
      };
      if (temCorpo) init.body = corpoCanonicoTexto;

      return new Request(request.url, init);
    },
  };
}
