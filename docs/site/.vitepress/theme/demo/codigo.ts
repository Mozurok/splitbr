/**
 * Constroi o snippet de codigo REAL do @splitbr/client para o passo/valores
 * atuais (D-8). Mostra como um PSP integra com a plataforma; a demo em si
 * calcula o mesmo split localmente pela calcularSegregacao, sem servidor (a
 * linha de honestidade fica na UI).
 *
 * Contrato do client (packages/client/src/client.ts, desde a 0.2.0):
 * createSplitClient({ baseUrl, kid, assinar }) retorna um client openapi-fetch
 * com .POST(path, { body }) / .GET(path, { params }); a assinatura
 * X-JWS-Signature e aplicada pelo middleware. Ate 2026-10-22 este snippet ainda
 * mostrava o tenantId do contrato v0.0.10, que a 0.2.0 removeu.
 */
const reais = (centavos: number) => (centavos / 100).toFixed(2);

/** openapi-fetch exige os parametros de rota em params.path. */
function parametrosDeRota(path: string): string {
  return path.includes("{cnpjRaizPspRecDir}")
    ? `, {\n  params: { path: { cnpjRaizPspRecDir: "12345678" } },\n}`
    : "";
}

const SETUP = `import { createSplitClient } from "@splitbr/client";

const cliente = createSplitClient({
  baseUrl: "https://api.seu-psp.com.br",
  kid: "minha-chave-01",     // identificador da sua chave de assinatura
  assinar: assinarComRS256,  // (bytes) => assinatura crua; a chave é sua
});`;

/** endpointComMetodo: ex. "POST /api/v1/boleto" ou "GET /api/v1/out/...". */
export function snippetCodigo(
  endpointComMetodo: string,
  valorNotaCentavos: number,
  cbsCentavos: number,
  ibsCentavos: number,
): string {
  const espaco = endpointComMetodo.indexOf(" ");
  const metodo = endpointComMetodo.slice(0, espaco);
  const path = endpointComMetodo.slice(espaco + 1);

  if (metodo === "GET") {
    return `${SETUP}

// Puxa os retornos do fisco (Retorno Super Inteligente)
const { data } = await cliente.GET("${path}"${parametrosDeRota(path)});`;
  }

  return `${SETUP}

await cliente.POST("${path}", {
  body: {
    transacoes: [{
      numCtrlOrig: "CTRL000001",
      vlInf: ${reais(valorNotaCentavos)},
      vlCbsInf: ${reais(cbsCentavos)},
      vlIbsInf: ${reais(ibsCentavos)},
    }],
  },
});`;
}
