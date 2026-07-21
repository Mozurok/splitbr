/**
 * Constroi o snippet de codigo REAL do @splitbr/client para o passo/valores
 * atuais (D-8). Mostra como um PSP integra com a plataforma; a demo em si
 * calcula o mesmo split localmente pela calcularSegregacao, sem servidor (a
 * linha de honestidade fica na UI).
 *
 * Contrato do client (packages/client/src/client.ts + headers.ts, lido nesta
 * sessao): createSplitClient({ baseUrl, tenantId, correlationId? }) retorna um
 * client openapi-fetch com .POST(path, { body }) / .GET(path); os 4 headers
 * obrigatorios sao injetados pelo middleware.
 */
const reais = (centavos: number) => (centavos / 100).toFixed(2);

const SETUP = `import { createSplitClient } from "@splitbr/client";

const cliente = createSplitClient({
  baseUrl: "https://api.seu-psp.com.br",
  tenantId: "12345678000199",
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
const { data } = await cliente.GET("${path}");`;
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
